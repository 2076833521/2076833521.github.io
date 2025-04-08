<?php
/**
 * 增强版唯一IP访问统计插件
 * 
 * 功能：
 * 1. 每个IP每天只计一次访问量
 * 2. 显示网站总唯一IP访问量
 * 3. 显示今日唯一IP访问量
 * 4. 显示当前在线访客（15分钟内活跃）
 * 5. 显示最近访客数量（1小时、24小时、7天）
 * 6. 最近访客列表显示每个IP的最后一次访问记录
 * 7. 仅在特定页面显示统计信息
 */

class EnhancedUniqueVisitorCounter {
    private $counterFile = 'visitor_counter.dat';
    private $dailyCounterFile = 'daily_visitor_counter.dat';
    private $dailyIpsFile = 'daily_ips.dat';
    private $lastResetDateFile = 'last_reset_date.dat';
    private $onlineUsersFile = 'online_users.dat';
    private $recentVisitorsFile = 'recent_visitors.dat';
    private $visitorHistoryFile = 'visitor_history.dat';
    private $onlineTimeout = 900; // 15分钟（秒）
    private $maxRecentVisitors = 20;
    private $showOnPage = false;
    
    public function __construct($showOnThisPage = false) {
        $this->showOnPage = $showOnThisPage;
        
        $this->initializeFiles();
        $this->checkDailyReset();
        $this->updateOnlineUsers();
        $this->updateRecentVisitors();
        $this->updateVisitorHistory();
        $this->incrementCounterIfUnique();
    }
    
    private function initializeFiles() {
        $files = [
            $this->counterFile => '0',
            $this->dailyCounterFile => '0',
            $this->dailyIpsFile => serialize([]),
            $this->lastResetDateFile => date('Y-m-d'),
            $this->onlineUsersFile => serialize([]),
            $this->recentVisitorsFile => serialize([]),
            $this->visitorHistoryFile => serialize([
                'hourly' => [],
                'daily' => [],
                'weekly' => []
            ])
        ];
        
        foreach ($files as $file => $default) {
            if (!file_exists($file)) {
                file_put_contents($file, $default);
            }
        }
    }
    
    private function checkDailyReset() {
        $lastResetDate = file_get_contents($this->lastResetDateFile);
        $currentDate = date('Y-m-d');
        
        if ($lastResetDate !== $currentDate) {
            file_put_contents($this->dailyCounterFile, '0');
            file_put_contents($this->dailyIpsFile, serialize([]));
            file_put_contents($this->lastResetDateFile, $currentDate);
        }
    }
    
    private function incrementCounterIfUnique() {
        $userIp = $this->getUserIp();
        $dailyIps = unserialize(file_get_contents($this->dailyIpsFile));
        
        if (in_array($userIp, $dailyIps)) {
            return;
        }
        
        $dailyIps[] = $userIp;
        file_put_contents($this->dailyIpsFile, serialize($dailyIps));
        
        $fp = fopen($this->counterFile, 'r+');
        if (flock($fp, LOCK_EX)) {
            $count = (int)file_get_contents($this->counterFile);
            $count++;
            file_put_contents($this->counterFile, $count);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
        
        $fpDaily = fopen($this->dailyCounterFile, 'r+');
        if (flock($fpDaily, LOCK_EX)) {
            $dailyCount = (int)file_get_contents($this->dailyCounterFile);
            $dailyCount++;
            file_put_contents($this->dailyCounterFile, $dailyCount);
            flock($fpDaily, LOCK_UN);
        }
        fclose($fpDaily);
    }
    
    private function updateOnlineUsers() {
        $userIp = $this->getUserIp();
        $currentTime = time();
        
        $onlineUsers = unserialize(file_get_contents($this->onlineUsersFile));
        
        foreach ($onlineUsers as $ip => $lastSeen) {
            if ($currentTime - $lastSeen > $this->onlineTimeout) {
                unset($onlineUsers[$ip]);
            }
        }
        
        $onlineUsers[$userIp] = $currentTime;
        file_put_contents($this->onlineUsersFile, serialize($onlineUsers));
    }
    
    private function updateRecentVisitors() {
        $userIp = $this->getUserIp();
        $currentTime = time();
        
        $recentVisitors = unserialize(file_get_contents($this->recentVisitorsFile));
        
        // 移除当前IP的旧记录
        $recentVisitors = array_filter($recentVisitors, function($visitor) use ($userIp) {
            return $visitor['ip'] !== $userIp;
        });
        
        // 添加新记录
        array_unshift($recentVisitors, [
            'ip' => $userIp,
            'time' => $currentTime,
            'date' => date('Y-m-d H:i:s')
        ]);
        
        if (count($recentVisitors) > $this->maxRecentVisitors) {
            $recentVisitors = array_slice($recentVisitors, 0, $this->maxRecentVisitors);
        }
        
        file_put_contents($this->recentVisitorsFile, serialize($recentVisitors));
    }
    
    private function updateVisitorHistory() {
        $userIp = $this->getUserIp();
        $currentTime = time();
        
        $history = unserialize(file_get_contents($this->visitorHistoryFile));
        
        // 更新小时级统计（最近1小时）
        $hourAgo = $currentTime - 3600;
        $history['hourly'][$userIp] = $currentTime;
        $history['hourly'] = array_filter($history['hourly'], function($time) use ($hourAgo) {
            return $time > $hourAgo;
        });
        
        // 更新天级统计（最近24小时）
        $dayAgo = $currentTime - 86400;
        $history['daily'][$userIp] = $currentTime;
        $history['daily'] = array_filter($history['daily'], function($time) use ($dayAgo) {
            return $time > $dayAgo;
        });
        
        // 更新周级统计（最近7天）
        $weekAgo = $currentTime - 604800;
        $history['weekly'][$userIp] = $currentTime;
        $history['weekly'] = array_filter($history['weekly'], function($time) use ($weekAgo) {
            return $time > $weekAgo;
        });
        
        file_put_contents($this->visitorHistoryFile, serialize($history));
    }
    
    private function getUserIp() {
        $ip = '';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        
        return $ip;
    }
    
    private function getOnlineUsersCount() {
        $onlineUsers = unserialize(file_get_contents($this->onlineUsersFile));
        return count($onlineUsers);
    }
    
    private function getUniqueRecentVisitors() {
        $recentVisitors = unserialize(file_get_contents($this->recentVisitorsFile));
        
        $uniqueVisitors = [];
        foreach ($recentVisitors as $visitor) {
            if (!isset($uniqueVisitors[$visitor['ip']])) {
                $uniqueVisitors[$visitor['ip']] = $visitor;
            }
        }
        
        usort($uniqueVisitors, function($a, $b) {
            return $b['time'] - $a['time'];
        });
        
        return array_slice($uniqueVisitors, 0, $this->maxRecentVisitors);
    }
    
    private function getTodayUniqueIpsCount() {
        $dailyIps = unserialize(file_get_contents($this->dailyIpsFile));
        return count($dailyIps);
    }
    
    private function getRecentVisitorCounts() {
        $history = unserialize(file_get_contents($this->visitorHistoryFile));
        
        return [
            'last_hour' => count($history['hourly']),
            'last_24h' => count($history['daily']),
            'last_7d' => count($history['weekly'])
        ];
    }
    
    public function getCounters() {
        return [
            'total' => (int)file_get_contents($this->counterFile),
            'today_unique' => $this->getTodayUniqueIpsCount(),
            'online' => $this->getOnlineUsersCount(),
            'recent_unique' => $this->getUniqueRecentVisitors(),
            'recent_counts' => $this->getRecentVisitorCounts()
        ];
    }
    
    public function displayCounter($style = 'default') {
        if (!$this->showOnPage) {
            return '';
        }
        
        $counters = $this->getCounters();
        
        $recentVisitorsHtml = '';
        foreach ($counters['recent_unique'] as $visitor) {
            $recentVisitorsHtml .= "<li>{$visitor['ip']} - {$visitor['date']}</li>";
        }
        
        $output = "<div class='visitor-counter {$style}'>";
        $output .= "<h3>网站访问统计</h3>";
        
        // 主要统计数据
        $output .= "<div class='counter-grid'>";
        $output .= "<div class='counter-box total'>";
        $output .= "<span class='counter-label'>总访问量</span>";
        $output .= "<span class='counter-value'>{$counters['total']}</span>";
        $output .= "<span class='counter-note'>(唯一IP)</span>";
        $output .= "</div>";
        
        $output .= "<div class='counter-box today'>";
        $output .= "<span class='counter-label'>今日访问</span>";
        $output .= "<span class='counter-value'>{$counters['today_unique']}</span>";
        $output .= "<span class='counter-note'>(唯一IP)</span>";
        $output .= "</div>";
        
        $output .= "<div class='counter-box online'>";
        $output .= "<span class='counter-label'>当前在线</span>";
        $output .= "<span class='counter-value'>{$counters['online']}</span>";
        $output .= "<span class='counter-note'>(15分钟内)</span>";
        $output .= "</div>";
        $output .= "</div>"; // 结束counter-grid
        
        // 近期访客数量统计
        $output .= "<div class='recent-counts'>";
        $output .= "<h4>近期访客数量</h4>";
        $output .= "<div class='count-grid'>";
        $output .= "<div class='count-box hour'>";
        $output .= "<span class='count-label'>最近1小时</span>";
        $output .= "<span class='count-value'>{$counters['recent_counts']['last_hour']}</span>";
        $output .= "</div>";
        
        $output .= "<div class='count-box day'>";
        $output .= "<span class='count-label'>最近24小时</span>";
        $output .= "<span class='count-value'>{$counters['recent_counts']['last_24h']}</span>";
        $output .= "</div>";
        
        $output .= "<div class='count-box week'>";
        $output .= "<span class='count-label'>最近7天</span>";
        $output .= "<span class='count-value'>{$counters['recent_counts']['last_7d']}</span>";
        $output .= "</div>";
        $output .= "</div>"; // 结束count-grid
        $output .= "</div>"; // 结束recent-counts
        
        // 最近访客列表
        $output .= "<div class='recent-visitors'>";
        $output .= "<h4>最近访客 <small>(每个IP只显示最后一次访问)</small></h4>";
        $output .= "<ul>{$recentVisitorsHtml}</ul>";
        $output .= "</div>";
        
        $output .= "<p class='update-time'>最后更新: " . date('Y-m-d H:i:s') . "</p>";
        $output .= "</div>";
        
        return $output;
    }
}
// 使用示例


?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <style>
/* 基础样式 */
/* 基础样式 */
.visitor-counter {
    border: 1px solid #e0e0e0;
    padding: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 800px;
    margin: 20px auto;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.visitor-counter h3 {
    margin-top: 0;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    font-size: 1.5em;
}

/* 统计网格布局 */
.counter-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 20px;
}

.counter-box {
    background: white;
    padding: 15px;
    border-radius: 6px;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.counter-label {
    display: block;
    font-size: 0.9em;
    color: #666;
    margin-bottom: 5px;
}

.counter-value {
    display: block;
    font-size: 2em;
    font-weight: bold;
    color: #333;
}

.counter-note {
    display: block;
    font-size: 0.8em;
    color: #999;
    margin-top: 3px;
}

/* 不同统计项的配色 */
.counter-box.total {
    border-top: 3px solid #e74c3c;
}

.counter-box.today {
    border-top: 3px solid #3498db;
}

.counter-box.online {
    border-top: 3px solid #2ecc71;
}

/* 近期访客数量统计 */
.recent-counts {
    margin: 20px 0;
    background: white;
    padding: 15px;
    border-radius: 6px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.recent-counts h4 {
    margin-top: 0;
    color: #555;
    font-size: 1.2em;
}

.count-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.count-box {
    text-align: center;
    padding: 10px;
}

.count-label {
    display: block;
    font-size: 0.85em;
    color: #666;
}

.count-value {
    display: block;
    font-size: 1.5em;
    font-weight: bold;
    color: #333;
}

/* 不同时间段的配色 */
.count-box.hour .count-value {
    color: #e67e22;
}

.count-box.day .count-value {
    color: #9b59b6;
}

.count-box.week .count-value {
    color: #1abc9c;
}

/* 最近访客列表 */
.recent-visitors {
    background: white;
    padding: 15px;
    border-radius: 6px;
    margin-top: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.recent-visitors h4 {
    margin-top: 0;
    color: #555;
    font-size: 1.2em;
}

.recent-visitors h4 small {
    font-size: 0.7em;
    color: #999;
    font-weight: normal;
}

.recent-visitors ul {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 300px;
    overflow-y: auto;
}

.recent-visitors li {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.9em;
    color: #555;
}

.recent-visitors li:last-child {
    border-bottom: none;
}

.update-time {
    font-size: 0.8em;
    color: #999;
    text-align: right;
    margin-top: 15px;
}

/* 响应式设计 */
@media (max-width: 600px) {
    .counter-grid, .count-grid {
        grid-template-columns: 1fr;
    }
    
    .counter-box, .count-box {
        margin-bottom: 10px;
    }
}

/* 现代风格 */
.visitor-counter.modern {
    background: linear-gradient(135deg, #3498db, #2c3e50);
    color: white;
    border: none;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.visitor-counter.modern h3,
.visitor-counter.modern h4 {
    color: white;
    border-bottom-color: rgba(255,255,255,0.2);
}

.visitor-counter.modern .counter-box,
.visitor-counter.modern .recent-counts,
.visitor-counter.modern .recent-visitors {
    background: rgba(255,255,255,0.1);
    color: white;
    box-shadow: none;
}

.visitor-counter.modern .counter-label,
.visitor-counter.modern .count-label,
.visitor-counter.modern .counter-note,
.visitor-counter.modern .recent-visitors h4 small {
    color: rgba(255,255,255,0.8);
}

.visitor-counter.modern .counter-value,
.visitor-counter.modern .count-value,
.visitor-counter.modern .recent-visitors li {
    color: white;
}

.visitor-counter.modern .recent-visitors li {
    border-bottom-color: rgba(255,255,255,0.1);
}

.visitor-counter.modern .update-time {
    color: rgba(255,255,255,0.6);
}
    </style>
</head>
</html>
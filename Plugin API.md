# Plugin API

## 简介

XR 脚本由 **Java 逻辑 + HTML 界面** 两部分组成，两条通道相互独立、可自由组合：

- **逻辑层（Java）**：脚本入口 `main.java` 采用 **Java 8 语法**（解释型执行），支持 Lambda、方法引用、Stream 等特性，并额外支持 `var` 局部变量声明（预处理转译）；辅助类放入 `src/` 目录，由内置编译通道以 **Java 21 现代语法**（`record`、`record` 模式、`instanceof` 模式、文本块、`switch` 表达式、Stream 等）**自动编译**为 dex 并可 `import` 使用（详见「编译通道」章节）。脚本不支持注解。
- **界面层（HTML/CSS/JavaScript）**：`showHtml()` 弹出页面渲染 HTML 内容，`openUrl()` 打开网页——WebView 内 JavaScript 已启用，可构建交互式界面（详见「其他辅助方法 → 界面」章节）。

> 注意：`record` / `record` 模式 / `switch` 模式匹配需要 Android 14+（API 34），低版本设备会在编译期报错（见「编译通道」限制）。

脚本目录：位于数据目录下的 `scripts` 文件夹中（每个插件一个子目录），支持本地创建与从在线脚本库下载。

---

## 开发环境说明

脚本同时提供**编译通道（Java 21 现代语法）**与**解释执行（Java 8）**两条书写通道，按代码位置自动选择：

- **编译通道（`src/` 目录）**：Java 21 全语法支持——`record`、`record` 模式、`instanceof` 模式、文本块、`switch` 表达式（`->` 形式）、Stream 等开箱即用，启动时自动编译为 dex 并加入类加载链，脚本内直接 `import`。无 `src/` 目录则完全跳过，零开销。

- **语法支持（main.java）**：Java 8 特性，包括 Lambda 表达式 (`->`)、流式 API (`Stream`)，并支持 Kotlin 空安全操作符 `?.`（安全调用）与 `?:`（Elvis 操作符）以简化空值处理。

- **语法上限（main.java）**：脚本本体仅支持 Java 8 语法 + `var` 声明（`var x = ...` 自动转译为无类型声明）。`record`、文本块、`switch` 表达式（`->` 形式）、模式匹配等其余 Java 9+ 语法需写入 `src/` 目录（见「编译通道」章节），或用 `loadJar`/`loadDex` 加载预编译产物后在脚本中 `import` 使用。

- **属性访问**：推荐使用成员符 `.` 直接访问对象属性（如 `msgData.msg`），无需调用 Getter 方法或者复杂的反射。

- **方法访问**：无需强制类型转换即可自动调用对应签名的方法和字段。

- **全局作用域**：`context` 及所有 API 方法在脚本任意位置（含内部类、Lambda）均可直接调用，**无需传递**。

- **线程模型**：事件回调默认在 **IO 线程** 执行。操作 UI 需切换至主线程，内置 `toast` 已自动处理线程切换。

- **能力边界**：脚本仅通过本文档提供的 API 与 QQ 交互。请勿依赖宿主内部类或未公开的结构，此类用法不受支持，且可能在版本更新后失效。

---

## 编译通道（现代 Java 语法）

脚本目录下的 `src/**/*.java` 会在插件启动时**自动编译**为 dex 并加入脚本类加载链，脚本内可直接 `import` 使用。适用于需要 `record`、`switch` 表达式、文本块、`instanceof` 模式匹配、Stream 等现代语法的辅助类。

- **目录约定**：`插件目录/src/` 下的 `.java` 文件（递归）；没有 `src/` 目录的插件完全不受影响（零开销，跳过编译）。
- **语法级别**：Java 21（`var` / `record` / `instanceof` 模式 / 文本块 / Stream 等），`src/` 目录之外的脚本本体仍按 Java 8 语法书写。
- **可用 API**：编译 classpath 为 Android 常用包（`java.*`、常见 `android.*`）。QQ 特有类型不在 classpath 内，跨边界交互请用 `Object` 参数。
- **增量构建**：编译产物缓存于 `数据目录/cache/build/`（dex + 源文件指纹），源文件未变时直接复用，无需重复编译。
- **错误处理**：编译失败写入 `error.txt`，不阻断 `main.java` 解释执行；脚本内使用未成功编译的类时会在 `import`/调用处得到明确报错。
- **限制**：`record`（含 `record` 模式）与 `switch` 模式匹配（`case X x ->`、`case null`）需要 Android 14+（API 34）才支持；低版本设备上编译通道会在编译期拒绝并提示替代写法（record 换普通类、模式匹配换 `->` switch 语句），不会运行期缺类。密封类在编译后不强制 exhaustive `switch`；辅助类内无法直接调用脚本级 API（`log`/`toast` 等），需通过参数传入或反射。
- **显式编译**：运行时也可调用 `compileJava(path)`（见「动态加载」）编译单个文件或目录。

示例（`src/util/Helper.java`）：

```java
package util;

public record Helper(String name, int count) {
    public String describe() {
        return "name=" + name + ", count=" + count;
    }
}
```

脚本中：

```java
import util.Helper;
Helper h = new Helper("xr", 42);
log(h.describe());
```

---

## Lambda 表达式支持

理论支持标准的 Java Lambda 语法，可用于简化代码或实现各类函数式接口（如 `Runnable`, `Comparator`, `Consumer` 等，以及脚本中自定义的符合单抽象方法的接口）。

### 1. 基础语法
支持 `->` 表达式，可用于单行语句或代码块。

```java
// 示例 1: 启动线程 (Runnable)
new Thread(() -> {
    // 处理逻辑...
    log("线程执行中");
}).start();

// 示例 2: 列表排序 (Comparator)
Collections.sort(list, (a, b) -> a.length() - b.length());

// 示例 3: 结合 Stream 使用
list.stream().filter(s -> s.startsWith("A")).count();
```

### 2. 方法引用 (::)
支持通过双冒号 `::` 引用现有的 Java 方法：

*   **静态方法**：如 `Math::max`
*   **实例方法**：如 `System.out::println`
*   **类名引用实例方法**：如 `String::toUpperCase`
*   **构造函数**：如 `ArrayList::new`

### 3. 引用脚本方法 (this::)
可以使用 `this` 关键字引用当前脚本中定义的方法（包括自定义方法和 API 内置方法），检测比较宽泛，参数数量与目标接口函数匹配即可，尝试调用失败时报错。

```java
// 定义一个脚本方法
public void handleItem(Object item) {
    log("处理: " + item);
}

// 在需要函数式接口的地方引用它
list.forEach(this::handleItem);

// 也可以直接引用 API 提供的内置方法
list.forEach(this::log);
```

---

## 脚本必须文件

- **main.java**：脚本执行入口
- **desc.txt**：脚本描述文件（可选）
- **info.prop**：配置文件  
  包含如下配置项：
  - `id` → 脚本唯一标识符
  - `pluginName` → 脚本名称
  - `author` → 作者
  - `versionCode` → 版本号

## 全局变量

| 变量名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `context` | `android.content.Context` | 宿主 App 全局上下文 |
| `pluginId` | `String` | 当前加载脚本 ID (**注意大小写**) |
| `pluginPath` | `String` | 当前加载脚本的文件夹绝对路径（注意无/） |
| `myUin` | `String` | 当前登录的 QQ 号 |

---

## 核心数据结构 (Java Beans)

### 1. MsgData (消息对象)
用于 `onMsg` 回调中。
- `int type`: 聊天类型 (1:好友/私聊, 2:群聊, 100:陌生人)
- `int msgType`: 消息类型
- `String peerUin`: 群号或好友QQ号
- `String peerUid`: 群号或好友UID
- `String userUin`: 发送者QQ号
- `String userUid`: 发送者UID
- `long time`: 发送时间戳 (秒)
- `long msgId`: 消息ID
- `String msg`: 文本消息内容 (包含 `[pic=url]` 等格式)
- `String path`: 文件/视频/语音保存路径
- `List<String> atList`: 消息中艾特的QQ号列表
- `Map<String, String> atMap`: 艾特映射表 (Key: Uin, Value: 艾特内容)
- `Object data`: 原始消息记录对象（一般无需访问）
- `Object contact`: 原始联系人对象（一般无需访问，发送类方法可直接传入）

派生便捷字段：
- `String SenderNickName`: 发送者昵称
- `boolean IsGroup`: 是否群聊（`type == 2`）
- `boolean IsSend`: 是否自己发送的消息
- `String FileName` / `String LocalPath` / `long FileSize` / `String FileUrl`: 文件信息
- `String md5`: 消息 MD5（当前恒为空串）
- `String ReplyTo`: 回复的用户账号（当前恒为空串）
- `Object RecordMsg`: 被回复的消息（当前恒为 null）
- `String GuildID` / `String ChannelID` / `boolean IsChannel`: 频道信息（当前恒为默认值）
- `ArrayList<String> PicUrlList`: 图片链接列表（随 `[pic=]` 占位符一并填充）

### 2. FriendInfo (好友信息)
- `String uin`: QQ号
- `String uid`: UID
- `String name`: 昵称
- `String remark`: 备注

### 3. GroupInfo (群信息)
- `String group`: 群号
- `String groupName`: 群名称
- `String groupOwner`: 群主QQ号
- `Object groupInfo`: 原始群信息对象（一般无需访问）

派生便捷字段：
- `String[] AdminList`: 管理员列表（含群主；反射读取宿主字段，失败时为空数组）
- `boolean IsOwnerOrAdmin`: 当前账号是否群主或管理员

### 4. MemberInfo (群成员信息)
- `String uin`: 成员QQ号
- `String uinName`: 群名片/昵称
- `int uinLevel`: 群等级
- `long joinGroupTime`: 入群时间戳
- `long lastActiveTime`: 最后发言时间戳
- `String role`: 角色 (OWNER:群主, ADMIN:管理员, MEMBER:成员)
- `Object memberInfo`: 原始成员信息对象（一般无需访问）

派生便捷字段：
- `String UserName`: 好友备注（无备注时降级为昵称）
- `boolean IsOwner`: 是否群主
- `boolean IsAdmin`: 是否管理员或群主

### 5. ForbidInfo (禁言信息)
- `String user`: 被禁言成员QQ号
- `String userName`: 被禁言成员昵称
- `long time`: 剩余禁言时长 (秒)
- `long endTime`: 禁言结束时间戳

---

## 核心方法分类

### 一、消息相关方法

#### 1. sendMsg：发送消息
- **方法重载 1**：`sendMsg(String PeerUin, String 内容, int 聊天类型)`
  - 聊天类型：1好友 / 2群聊 / 100陌生人
  - 支持格式：
    - 艾特：`[atUin=QQ号]`（QQ号为0时表示艾特全体）
    - 图片：`[pic=图片链接或绝对路径]`
    - 可任意组合，将根据形式自动解析
- **方法重载 2**：`sendMsg(Object 联系人, String 内容)`
- **方法重载 3**：`sendMsg(String 群号, String QQ号, String 内容)`
  - QQ号为空时发送群消息，群号为空时发送私聊消息

#### 2. sendPic：发送图片
- **方法重载 1**：`sendPic(String PeerUin, String 图片路径, int 聊天类型)`
- **方法重载 2**：`sendPic(Object 联系人, String 图片路径)`
- **方法重载 3**：`sendPic(String 群号, String QQ号, String 图片路径)`

#### 3. sendPtt：发送语音
- **方法重载 1**：`sendPtt(String PeerUin, String 语音路径, int 聊天类型)`
- **方法重载 2**：`sendPtt(Object 联系人, String 语音路径)`
- **方法重载 3**：`sendPtt(String PeerUin, String 语音路径, int 聊天类型, int durationMs)`
- **方法重载 4**：`sendPtt(Object 联系人, String 语音路径, int durationMs)`

> `durationMs` 为毫秒；不传时从 silk 估算，失败回退 `1000ms`。

#### 4. sendCard：发送 JSON 卡片
- **方法重载 1**：`sendCard(String PeerUin, String JSON字符串, int 聊天类型)`
- **方法重载 2**：`sendCard(Object 联系人, String JSON字符串)`
- **方法重载 3**：`sendCard(String 群号, String QQ号, String 卡片JSON)`

#### 5. sendFile：发送文件
- **方法重载 1**：`sendFile(String PeerUin, String 文件路径, int 聊天类型)`
- **方法重载 2**：`sendFile(Object 联系人, String 文件路径)`
- **方法重载 3**：`sendFile(String 群号, String QQ号, String 文件路径)`

#### 6. sendVideo：发送视频
- **方法重载 1**：`sendVideo(String PeerUin, String 视频路径, int 聊天类型)`
- **方法重载 2**：`sendVideo(Object 联系人, String 视频路径)`
- **方法重载 3**：`sendVideo(String 群号, String QQ号, String 视频路径)`

#### 7. sendVoice：发送语音
- `sendVoice(String 群号, String QQ号, String 语音路径)`：等价于 `sendPtt`

#### 8. sendReplyMsg：发送引用回复
- **方法重载 1**：`sendReplyMsg(String PeerUin, long 引用消息ID, String 内容, int 聊天类型)`
- **方法重载 2**：`sendReplyMsg(Object 联系人, long 引用消息ID, String 内容)`

#### 9. recallMsg：撤回消息
- **方法重载 1**：`recallMsg(int 聊天类型, String PeerUin, long 消息ID)`
- **方法重载 2**：`recallMsg(Object 联系人, long 消息ID)`

#### 10. sendPai：拍一拍
- `sendPai(String 被拍者Uin, String PeerUin, int 聊天类型)`
  - `PeerUin`：在群里则是群号，私聊则是好友QQ
- `sendPai(String 群号, String 对方QQ)`（私聊时群号传空）

#### 11. revokeMsg：撤回消息
- `revokeMsg(Object msg)`：msg 为 `onMsg` 传入的消息对象，仅能撤回自己或管理员可撤回的消息

---

### 二、好友相关方法

#### 1. getAllFriend：获取好友列表
- `List<FriendInfo> getAllFriend()`
  - 返回 `FriendInfo` 对象列表 (见数据结构章节)。

#### 2. isFriend：判断好友
- `boolean isFriend(String uin)`

#### 3. sendZan：点赞
- `sendZan(String uin, int count)`

#### 4. Uin 与 Uid 转换
- `String getUidFromUin(String uin)`
- `String getUinFromUid(String uid)`

#### 5. 好友信息查询
- `String getFriendName(String uin)`：好友昵称，找不到返回空串
- `String getFriendRemark(String uin)`：好友备注，找不到返回空串

---

### 三、群管理与信息获取

#### 1. getGroupList：获取群列表
- `List<GroupInfo> getGroupList()`
  - 返回 `GroupInfo` 对象列表。

#### 2. getGroupMemberList：获取群成员列表
- `List<MemberInfo> getGroupMemberList(String 群号)`
  - 返回 `MemberInfo` 对象列表。

#### 3. getProhibitList：获取禁言列表
- `List<ForbidInfo> getProhibitList(String 群号)`
  - 返回 `ForbidInfo` 对象列表。

#### 4. getGroupInfo：获取单个群信息
- `Object getGroupInfo(String 群号)`
  - 返回原始群信息对象（一般无需访问，常规查询用 `getGroupList`）。

#### 5. getMemberInfo：获取单个成员信息
- `MemberInfo getMemberInfo(String 群号, String 成员QQ)`

#### 6. getGroupMemberName：获取群成员名称
- `String getGroupMemberName(String 群号, String 成员QQ)`：群名片/昵称，找不到返回空串

#### 7. 群信息查询
- `String getGroupName(String 群号)`：群名称，找不到返回空串

#### 8. shutUp：禁言成员
- `shutUp(String 群号, String 成员QQ, long 秒数)`
  - 传 0 为解禁。

#### 9. shutUpAll：全员禁言
- `shutUpAll(String 群号, boolean 是否开启)`

#### 10. kickGroup：踢出群成员
- `kickGroup(String 群号, String 成员QQ, boolean 是否拉黑)`
  - `是否拉黑`：不再接收此人申请。

#### 11. setGroupAdmin：设置管理员
- `setGroupAdmin(String 群号, String 成员QQ, boolean 是否设为管理)`

#### 12. setGroupMemberTitle：设置头衔 (仅群主)
- `setGroupMemberTitle(String 群号, String 成员QQ, String 头衔)`

#### 13. changeMemberName：修改群名片
- `changeMemberName(String 群号, String 成员QQ, String 新名片)`

#### 14. isShutUp：判断群是否全员禁言
- `boolean isShutUp(String 群号)`

#### 15. clockIn：群打卡
- `clockIn(String 群号)`

---

### 四、Cookie & Token 方法

> ⚠️ 以下方法返回账号级凭据（Skey/Pskey 等），请仅在必要场景使用，切勿写入日志、上传或分享给第三方。

- `String getSkey()`
- `String getRealSkey()`
- `String getPskey(String 域名)`
- `String getPt4Token(String 域名)`
- `String getStweb()`
- `String getGTK(String 域名)`
- `String getGroupRKey()`：群聊图片 RKey
- `String getFriendRKey()`：私聊图片 RKey
- `long getBkn(String key)`

---

### 五、数据存储方法

数据保存在 `scripts/脚本ID/config/` 下的 JSON 文件中。

#### 1. 写入数据
- `putString(String 配置名, String 键, String 值)`
  - 值为 `null` 时删除该键
- `putInt(String 配置名, String 键, int 值)`
- `putLong(String 配置名, String 键, long 值)`
- `putBoolean(String 配置名, String 键, boolean 值)`
- `putFloat(String 配置名, String 键, float 值)`
- `putDouble(String 配置名, String 键, double 值)`

#### 2. 读取数据
- `String getString(String 配置名, String 键, String 默认值)`
- `int getInt(String 配置名, String 键, int 默认值)`
- `long getLong(String 配置名, String 键, long 默认值)`
- `boolean getBoolean(String 配置名, String 键, boolean 默认值)`
- `float getFloat(String 配置名, String 键, float 默认值)`
- `double getDouble(String 配置名, String 键, double 默认值)`
- `String getString(String 配置名, String 键)` —— 两参版本，未取到时返回 `null`

---

### 六、回调方法 (main.java)

在脚本中实现以下方法以接收事件：

#### 1. onMsg：接收消息
- `void onMsg(Object msgData)`
  - 参数为 `MsgData` 对象。

#### 2. 群变动事件
- `void joinGroup(String 群号, String 成员QQ)`：成员入群
- `void quitGroup(String 群号, String 成员QQ)`：成员退群
- `void shutUpGroup(String 群号, String 成员QQ, long 时间, String 操作者QQ)`：群禁言事件

#### 3. 交互事件
- `void chatInterface(int 聊天类型, String PeerUin, String 名称)`：进入聊天界面
- `void onPaiYiPai(String PeerUin, int 聊天类型, String 操作者QQ)`：拍一拍事件
- `void onClickFloatingWindow(int 聊天类型, String 群号或QQ号)`：打开脚本悬浮窗菜单时触发

#### 4. 发送预处理
- `String getMsg(String 原始内容)`
  - 发送文本消息前触发，返回修改后的文本内容。

#### 5. 生命周期
- `void unLoadPlugin()`：脚本停止/卸载时触发。

---

### 七、菜单功能

#### 1. 脚本菜单 (悬浮窗)
- **添加**：`addItem(String 菜单名, String 回调方法名)`
- **添加临时菜单**：`addTemporaryItem(String 菜单名, String 回调方法名)`
  - 与 `addItem` 相同，但菜单弹窗关闭后自动删除
- **删除菜单**：`removeItem(String 菜单名)`
- **回调定义**：
  ```java
  // 3参数版本
  void 回调方法名(int 聊天类型, String PeerUin, String 名称) { ... }
  
  // 4参数版本 (包含 Contact 对象)
  void 回调方法名(int 聊天类型, String PeerUin, String 名称, Object contact) { ... }
  ```
#### 2. 消息菜单 (长按消息)
- **添加**：`addMenuItem(String 菜单名, String 回调方法名, int[] 消息类型数组)`
  - 最后一个参数为空或不写则默认所有消息
- **删除选项**：`removeMenu(String 菜单名)`
- **回调定义**：
  ```java
  void 回调方法名(Object msgData) { 
      //msgData为MsgData对象
  }
  ```

### 八、其他辅助方法

#### 1. 日志与提示
- `log(Object 内容)`：追加写入日志到脚本目录 `log.txt`
- `log(String 文件名, String 内容)`：追加写入日志到脚本目录下指定文件
- `toast(Object 内容)`：系统 Toast
- `qqToast(int 图标类型, Object 内容)`：QQ 风格顶部弹窗
  - 图标：0=警告, 1=错误/失败, 2=成功
- `error(Throwable)`：打印异常堆栈到脚本目录 `error.txt`

#### 2. 动态加载
- `loadJava(String 路径)`：解释执行一个 `.java` 文件；传目录则递归加载目录下全部 `.java`（自动跳过 `src/` 子目录，该目录属于编译通道）。支持 UTF-8 BOM。
- `compileJava(String 路径)`：**编译通道**——将单个 `.java` 文件或目录（含同目录其他文件）以 Java 21 语法编译为 dex 并加载，脚本内可 `import` 使用（详见「编译通道」章节）。
- `loadJar(String jar文件路径)`
- `loadDex(String dex文件路径)`
- `registerActivity(Class<? extends Activity> 类)`
  - 注册后可使用startActivity启动
- `eval(String 代码)`：热加载执行一段 Java 代码

> jar，dex加载后可直接使用import导入

#### 3. 界面
- `Activity getNowActivity()`：获取当前顶层 Activity (可能为 null)
- `openUrl(String url)`：打开网页（挂载在当前窗口之上）
- `openUrl(String 标题, String url)`：打开网页并指定标题栏文字
- `showHtml(String html)`：弹出页面渲染 HTML 内容
- `showHtml(String 标题, String html)`：渲染 HTML 内容并指定标题栏文字
  - 页面基于内嵌 WebView：JavaScript 已启用，`http/https` 链接在页面内打开，其余协议（如 `mqqapi://`）交系统处理
- `String encryptHtml(String 明文)`：将 HTML 内容转换为密文，供 `showHtmlEncrypted` 使用
- `showHtmlEncrypted(String 密文)`：弹出页面渲染 HTML 密文
- `showHtmlEncrypted(String 标题, String 密文)`：渲染 HTML 密文并指定标题栏文字
  - 说明：`showHtml` 直接传明文即可正常使用；当不希望脚本文件里出现 HTML 明文（例如把脚本分享给他人时），先用 `encryptHtml` 生成密文，再以 `showHtmlEncrypted` 调用，显示效果与明文版完全一致

#### 4. HTML 页面示例
脚本逻辑（Java）负责组装数据，`showHtml` 渲染 HTML 界面：

```java
// 收到消息时弹出数据展示页
public void onMsg(Object msgData) {
    String html = "<h2>消息详情</h2>"
        + "<p>来自: " + msgData.peerUin + "</p>"
        + "<p>内容: " + msgData.msg + "</p>"
        + "<button onclick=\"alert('页面JS已启用')\">测试</button>";
    showHtml("消息详情", html);
}
```

> **能力边界**：页面内 JS 只能做页面自身的交互（DOM、动画、弹窗等），**无法反向调用脚本 API**（如页面按钮直接触发 `sendMsg`/`log`）；如需页面操作驱动脚本逻辑，需在模块侧扩展 JS 桥接。另外 `showHtml` 每次弹出独立页面，页面间不共享状态——跨页面传递数据可借助 `putString`/`getString` 配置存储。

如需在脚本文件里隐藏 HTML 明文，用 `encryptHtml` + `showHtmlEncrypted`：

```java
// 第一步（开发时执行一次）：把 HTML 内容转成密文
log(encryptHtml("<h2>隐藏页面</h2><p>内容不直接出现在脚本里</p>"));  // 复制日志输出的密文

// 第二步：把上一步得到的密文写进脚本，替换下方 "粘贴密文" 字样
String cipher = "粘贴第一步输出的密文";
showHtmlEncrypted("隐藏页面", cipher);
```

> **提示**：密文由 `encryptHtml` 一次性生成、长期有效；脚本分享给他人时，对方只能看到密文，无法直接读出页面内容。`showHtml` 与 `showHtmlEncrypted` 显示效果一致，可按需选用。

#### 5. 网络请求
- `String httpGet(String url)`：同步 GET 请求，返回响应文本
- `String httpPost(String url, Map 参数)`：同步 POST 表单请求，仅支持字符串值

#### 6. 当前聊天窗口
- `int getChatType()`：当前聊天类型，1=私聊 2=群聊
- `String getCurrentGroupUin()`：当前聊天的群号，私聊返回空串
- `String getCurrentFriendUin()`：当前聊天的好友QQ，群聊返回空串
console.log("%c欢迎来到拟态UI4.0引导页", "color: #6d85c1; font-size: 2.5em;");
$(window).on('load', function handlePreloader() {
    if ($('.xf_load').length) {
        $('.xf_load').delay(200).fadeOut(500);
    }
});
(function () {
    const container = document.getElementById('xf_typewriter')
    const data = '本站前端源代码以及UI图由小枫原创，采用GPL2.0开源协议！'.split('')
    let index = 0

    function writing() {
        if (index < data.length) {
            container.innerHTML += data[index++]
            let timer = setTimeout(writing, 120)
            console.log(timer) 
        }
    }
    writing()
})();
$('.xf_verify').bind('input propertychange', function () {
    var c = $(this);
    if (/[^\w]/.test(c.val())) {
        var temp_amount = c.val().replace(/[^\w]/g, '');
        $(this).val(temp_amount);
    }
})
document.oncontextmenu = new Function("event.returnValue=false;");
let information = document.querySelectorAll('.segmented-control .info')
let divs = document.querySelectorAll('.xf_Show_box .menu_1')
for (let i = 0; i < information.length; i++) {
    information[i].addEventListener('click', function () {
        document.querySelector('.xf_Show_box .menu_2').classList.remove('menu_2')
        divs[i].classList.add('menu_2')
    })
}
// 打招呼
let lili = document.querySelector('.xf_name .hello')
let date = new Date()
let h = date.getHours()
if (h < 12) {
    lili.innerHTML = 'Good morning'
} else if (h < 18) {
    lili.innerHTML = 'Good afternoon'
} else {
    lili.innerHTML = 'Good evening'
}
let address = document.querySelector('.xf_name .address')
async function tianqi() {
    const data = await axios.get('https://api.vvhan.com/api/weather')
    if (data.status === 200) {
        address.innerHTML = `${data.data.city}市&nbsp${data.data.info.high}&nbsp${data.data.info.low}`
    }
}
tianqi()
let xf_inpname = document.querySelector('#xf_inpname')

xf_inpname.addEventListener('change', function () {
    let name = xf_inpname.value.trim()
    let reg1 = /^[\u4e00-\u9fa5]{1,7}$/.test(name)
    console.log(reg1)
    if (!reg1) {
        xf_inpname.value = ""
        swal('昵称只能是中文并且不能超过7个字符！')
        return
    }
})
let xf_inpemail = document.querySelector('#xf_inpemail')
xf_inpemail.addEventListener('focus', function () {
    if (xf_inpname.value.length === 0) {
        swal('请输入昵称！')
        xf_inpname.focus()
    }
})
xf_inpemail.addEventListener('change', function () {
    let email2 = xf_inpemail.value.trim()
    let reg2 = /[1-9]\d{7,10}@qq\.com/.test(email2)
    if (!reg2) {
        xf_inpemail.value = ""
        swal('请输入正确的qq邮箱格式')
        return
    }
})
let xf_inpmessage = document.querySelector('.xf_inpmessage')
let useCount = document.querySelector('.useCount')
let controls = document.querySelector('.controls')
xf_inpmessage.addEventListener('focus', function () {
    if (xf_inpemail.value.trim().length === 0) {
        xf_inpemail.focus()
        swal('请输入QQ邮箱')
    }
})
xf_inpmessage.addEventListener('input', function () {
    useCount.innerHTML = this.value.length
})
xf_inpmessage.addEventListener('focus', function () {
    controls.style.display = 'block'
    if (xf_inpmessage.value.trim().length > 20) {
        swal('请输入20以内的文字')
        return
    }
})
let yanzheng = document.querySelector('.xf_verify_code')

function validation() {
    let num = ''
    for (let i = 0; i < 6; i++) {
        num += Math.floor(Math.random() * 10)
    }
    return num
}

yanzheng.innerHTML = validation()
let xf_verify_code = document.querySelector('.xf_verify_code')
xf_verify_code.addEventListener('click', function () {
    yanzheng.innerHTML = validation()
})
let verificationCode = document.querySelector('.xf_verify')
verificationCode.addEventListener('blur', function () {
    if (verificationCode.value.trim() !== yanzheng.innerHTML) {
        swal('验证码有误！')
        verificationCode.value = ""
        return
    }
})
let button = document.querySelector('.xf_submit')
let username = ''
let qqemail = ''
let info = ''
let img = ''
let ul = document.querySelector('.leave')
let data = [{
    username: '小枫',
    imgSrc: 'https://q2.qlogo.cn/headimg_dl?dst_uin=1809185784&spec=100',
    comments: '欢迎使用小枫拟态4.0ui'
},
{
    username: '老婆',
    imgSrc: 'https://q2.qlogo.cn/headimg_dl?dst_uin=3025202721&spec=100',
    comments: '欢迎使用小枫拟态4.0ui'
}
]
for (let i = 0; i < data.length; i++) {
    let li = document.createElement('li')
    li.innerHTML = `<div class="xf_sm_box xf_mimic_internal">
                              <img src=${data[i].imgSrc} alt="头像" id="ha">
                            <span>${data[i].username}</span>
                            <span>${dayjs(new Date()).format('YYYY-MM-DD')}</span>
                            <p>${data[i].comments}</p>
                        </div>`
    ul.appendChild(li, ul.children[0])
}
button.addEventListener('click', function (e) {
    e.preventDefault()
    if (xf_inpname.value.length === 0 || xf_inpemail.value.length === 0 || xf_inpmessage.value
        .length ===
        0 || verificationCode.value.length === 0) {
        swal('康康是不是少填了什么？')
        return
    }
    username = xf_inpname.value
    qqemail = xf_inpemail.value
    info = xf_inpmessage.value
    // 找填写的邮箱的QQ头像
    const qqnumber = qqemail.replace('@qq.com', '')
    img = `https://q2.qlogo.cn/headimg_dl?dst_uin=${qqnumber}&spec=100`
    data = []
    data.unshift({
        username: username,
        imgSrc: img,
        date: new Date().toLocaleTimeString(),
        comments: info
    })

    for (let i = 0; i < data.length; i++) {
        let li = document.createElement('li')
        li.innerHTML = `<div class="xf_sm_box xf_mimic_internal">
                                  <img src=${data[i].imgSrc} alt="头像" id="ha">
                                <span>${data[i].username}</span>
                                <span>${dayjs(new Date()).format('YYYY-MM-DD')}</span>
                                <p>${data[i].comments}</p>
                            </div>`
        ul.insertBefore(li, ul.children[0])
    }
    xf_inpname.value = ""
    xf_inpemail.value = ''
    xf_inpmessage.value = ''
    verificationCode.value = ''
})
var s1 = '2022-06-18';
s1 = new Date(s1.replace(/-/g, "/"));
s2 = new Date();
var days = s2.getTime() - s1.getTime();
var number_of_days = parseInt(days / (1000 * 60 * 60 * 24));
document.getElementById('xf_time').innerHTML = number_of_days;

$(window).scroll(function () {
    var sc = $(window).scrollTop();
    var rwidth = $(window).width()
    if (sc > 0) {
        $("#xf_GoTop").css("display", "block");
    } else {
        $("#xf_GoTop").css("display", "none");
    }
})
$("#xf_GoTop").click(function () {
    var sc = $(window).scrollTop();
    $('body,html').animate({
        scrollTop: 0
    }, 500);
})

var dark_mode = function () {
    window.darkMode.init({
        toggle: document.querySelector(".dark-mode-toggle"),
        classes: {
            light: "light",
            dark: "dark",
        },
        default: "light",
        storageKey: "example_dark_mode_pref",
        onInit: function (e) {
            e.style.visibility = "visible";
        },
        onChange: function (t) {
            console.log("启动昼夜模式：" + t);
        }
    });
}
dark_mode();
$(function () {
    $(".my-wx").eq(0).click(function () {
        if ($('.wx_picture').is(':hidden')) {
            $(".wx_picture").fadeIn(1000).show();
        } else {
            $(".wx_picture").hide(0);
        }
    });
    $(document).click(function (event) {
        var _con = $('.my-wx');
        if (!_con.is(event.target) && _con.has(event.target).length === 0) {
            $('.wx_picture').hide(0);
        }
    });
})
function my_friend() {
    window.open("../../friend.html");
}
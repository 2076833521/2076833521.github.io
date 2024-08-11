$(window).on('load', function handlePreloader() {
    if ($('.xf_load').length) {
        $('.xf_load').delay(200).fadeOut(500);
    }
});

document.oncontextmenu = new Function("event.returnValue=false;");

let web_name = document.querySelector('#web_name')
web_name.addEventListener('change', function () {
    let name = web_name.value.trim()
    let reg1 = /^[\u4E00-\u9FA5A-Za-z0-9]+$/.test(name)
    console.log(reg1)
    if (!reg1) {
        web_name.value = ""
        swal('网站名称只能输入中文、英文、数字')
        return
    }
})

let web_url = document.querySelector('#web_url')
web_url.addEventListener('focus', function () {
    if (web_name.value.length === 0) {
        swal('请输入网站名称！')
        web_name.focus()
    }
})
web_url.addEventListener('change', function () {
    let name = web_url.value.trim()
    let reg1 = /^[A-Za-z0-9:/.]+$/.test(name)
    console.log(reg1)
    if (!reg1) {
        web_url.value = ""
        swal('请输入正确的域名格式')
        return
    }
})

let web_ico = document.querySelector('#web_ico')
web_ico.addEventListener('focus', function () {
    if (web_url.value.length === 0) {
        swal('请输入网站URL！')
        web_url.focus()
    }
})
web_ico.addEventListener('change', function () {
    let name = web_ico.value.trim()
    let reg1 = /^[A-Za-z0-9/:.]+$/.test(name)
    console.log(reg1)
    if (!reg1) {
        web_ico.value = ""
        swal('请输入正确的域名格式')
        return
    }
})

let friend_inpemail = document.querySelector('#friend_inpemail')
friend_inpemail.addEventListener('focus', function () {
    if (web_ico.value.length === 0) {
        swal('请输入网站ICO！')
        web_ico.focus()
    }
})
friend_inpemail.addEventListener('change', function () {
    let email2 = friend_inpemail.value.trim()
    let reg2 = /[1-9]\d{7,10}@qq\.com/.test(email2)
    if (!reg2) {
        friend_inpemail.value = ""
        swal('请输入正确的qq邮箱格式')
        return
    }
})

let web_introduce_30 = document.querySelector('#web_introduce_30')
web_introduce_30.addEventListener('focus', function () {
    if (friend_inpemail.value.length === 0) {
        swal('请输入你的QQ邮箱')
        friend_inpemail.focus()
    }
})
let useCount = document.querySelector('.useCount')
let controls = document.querySelector('.controls')
web_introduce_30.addEventListener('input', function () {
    useCount.innerHTML = this.value.length
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

var s1 = '2022-06-18'; 
s1 = new Date(s1.replace(/-/g, "/"));
s2 = new Date();
var days = s2.getTime() - s1.getTime();
var number_of_days = parseInt(days / (1000 * 60 * 60 * 24));
document.getElementById('xf_time').innerHTML = number_of_days;
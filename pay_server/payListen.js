
// var RequestOrder={
//     appId:"xxxx",
//     orderId:"sdsdsdsd",
//     uId:"",
//     price:0,
//     notifyUrl:"",
//     goodsName:"",
//     channel:"",
//     key:"MD5",
// }

// var QRCodeMsg={
//     id,
//     orderId:0,
//     price,
//     realPrice:"",
//     timeOut:"",
//     isAny:"",
//     qrCode:"", 
//     key,
// }

// var notifyMsg={
//     id:"",
//     orderId:0,
//     uId:"",
//     goodsName:"",
//     income:"",
//     takeOff:"",
//     code:0,
 //    channel,
//     key,
// }

// let  msg={
//     appId:"gOZrfDKHf",
//     price:2.99,
//     tag:"test1",
//     channel:0,
//     key
// }


//1.导入http模块
let http = require('http');
let https = require('https');


let path = require('path');
//导入querystring模块（解析post请求数据）
let querystring = require('querystring');
const setting = require('./config/setting');
let crypto = require('crypto');
let url=require('url');

//2.创建服务器
let app = http.createServer();

//通知客户
function notifyMsg(msg,token){
    let md5 = crypto.createHash('md5');
    let str=msg.id+msg.orderId+msg.uId+msg.goodsName+msg.income+msg.takeOff+msg.code+msg.channel+token
    return md5.update(str).digest('hex');
}


//3.添加响应事件
app.on('request', function (req, res) {

    //1.通过判断url路径和请求方式来判断是否是表单提交
    if (req.url === '/test' && req.method === 'POST') {//下单
        let dataBuffer = '';
        req.on('data', function (chunk) {
            // chunk 默认是一个二进制数据，和 data 拼接会自动 toString
            dataBuffer += chunk;
        });

        req.on('end', async function () {
            dataBuffer = decodeURI(dataBuffer)
            let msg = querystring.parse(dataBuffer);
            console.log(msg)
             res.end(JSON.stringify({code:0}))
        });
    }
});

//4.监听端口号
app.listen(2000, function () {
    console.log('欢迎来到王者荣耀英雄管理器');
});
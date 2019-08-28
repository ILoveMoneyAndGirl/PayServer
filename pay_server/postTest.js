
var http = require('http');
var https = require('https');
var url = require('url');

var querystring = require('querystring');
var request = require('request')
var crypto = require('crypto');
var md5 = crypto.createHash('md5');

// let data={}
// let tData={}

// for (var i = 0; i < 10; i++) {
// 	if(!data["aa"]){
// 		console.log(1)
// 		data["aa"]={}
// 	}
// 	const t={
// 		id:i,
// 		url:"u"
// 	}
// 	data["aa"]["vv"+i]=t
// }

// console.log(data["aa"]["vv0"])
// let rate=0.03
// let price=10.67

// let takeoff=rate*price
// console.log(takeoff)
// takeoff=takeoff.toFixed(3)
// console.log(takeoff)

// function timeOutDel(appId,urlId) {
//   //发送数据 表示超时
//   console.log(appId,urlId)
//   delete data[appId][urlId]
//    console.log(data)
// }

//   let time=1000
//   for (var i = 0; i < 10; i++) {
//   	 let st=setTimeout(timeOutDel,time,"aa","vv"+i)
//   	 tData[i]=st
//   }
//   for (var i = 0; i < 10; i++) {
//   	clearTimeout(tData[i])
//   }

let tokenv="zleb0OlTgo"

let  msg={
    appId:"gOZrfDKHf",
    orderId:"testOderId",
    uId:"testUser",
    price:1,
    notifyUrl:"http://127.0.0.1:2000/test",
    goodsName:"testGoods",
    channel:1,
}

msg.key=getRequestKey(msg,tokenv)
function getRequestKey(msg,token){
    let str=msg.appId+msg.orderId+msg.uId+msg.price+msg.notifyUrl+msg.goodsName+msg.channel+token
    return md5.update(str).digest('hex');
}

Notify("http://127.0.0.1:3000/order",msg)
function Notify(notifyUrl,data)
{
  let serverInfo =url.parse(notifyUrl)
    let port=80
    let protocol=http
    if(serverInfo.port)
        port=serverInfo.port
    if(serverInfo.protocol=='https:'){
        protocol=https
    }
    PostData(data,serverInfo.hostname,port,serverInfo.path,protocol)
}
function PostData (data,host,port,path,protocol){

	console.log(host,port,path)

  var content = querystring.stringify(data);

  var options = {
    hostname: host,
    port: port,
    path: path,
    method: 'POST',
    headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
       'Content-Length': content.length
     }
  };

  var req = protocol.request(options, function (res) {
    if(res.statusCode==200){
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
        });
    }else{
      console.log("服务器请求错误",res.statusCode)
    }

  });
  req.on('error', function (e) {
    console.log("PostData->req.on->error",e.message)
  });
  req.write(content);
  req.end();
}

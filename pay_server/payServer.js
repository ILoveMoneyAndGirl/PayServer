
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


const {PayUrl,PayRecord,PayProduct,AdminUserBalance} = require('./models');

let PAYURL_CACHE={}
let TIMEOUT_CACHE={}

const InvalidAppId=0
const InvalidRoute=1
const NoPayUrl=2
const KeyError=3
const QRCodeError=4
const InsufficientBalance=5

const PostCount=0

//2.创建服务器
let app = http.createServer();


function timeOutDel(appId,urlId) {
  //发送数据 表示超时
  let sendData= PAYURL_CACHE[appId][urlId].sendData
  sendData.code=1
  sendData.income=0
  sendData.takeOff=0

  sendData.key=notifyMsg(sendData,PAYURL_CACHE[appId][urlId].token)
  Notify(PAYURL_CACHE[appId][urlId].notifyUrl,sendData)
  delete PAYURL_CACHE[appId][urlId]
}

function cmp(a,b){
  return a.price-b.price
}

//发起订单
function getRequestKey(msg,token){
    let md5 = crypto.createHash('md5');
    let str=msg.appId+msg.orderId+msg.uId+msg.price+msg.notifyUrl+msg.goodsName+msg.channel+token
    return md5.update(str).digest('hex');
}
//返回二维码
function getSendQRCodeKey(msg,token){
    let md5 = crypto.createHash('md5');
    let str=msg.id+msg.orderId+msg.price+msg.realPrice+msg.timeOut+msg.isAny+msg.qrCode+token
    return md5.update(str).digest('hex');
}
//收到移动端通知
function getAPPNotifyKey(msg,token){
    let md5 = crypto.createHash('md5');
     let str=msg.appId+msg.price+msg.tag+msg.channel+token
    return md5.update(str).digest('hex');
}
//通知客户
function notifyMsg(msg,token){
    let md5 = crypto.createHash('md5');
    let str=msg.id+msg.orderId+msg.uId+msg.goodsName+msg.income+msg.takeOff+msg.code+msg.channel+token
    return md5.update(str).digest('hex');
}


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
    PostData(data,serverInfo.hostname,port,serverInfo.path,protocol,0)
}
function PostData (data,host,port,path,protocol,count){

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

  var req = protocol.request(options);
  req.on('error', function (e) {
    if(count<1)
        PostData(data,host,port,path,protocol,count+1)
  });
  req.setTimeout(10000, function(){
     this.abort()
  })

  req.write(content);
  req.end();
}

//3.添加响应事件
app.on('request', function (req, res) {

    let  sendData={}
    //1.通过判断url路径和请求方式来判断是否是表单提交
    if (req.url === '/order' && req.method === 'POST') {//下单
        let dataBuffer = '';
        req.on('data', function (chunk) {
            // chunk 默认是一个二进制数据，和 data 拼接会自动 toString
            dataBuffer += chunk;
        });

        req.on('end', async function () {
            dataBuffer = decodeURI(dataBuffer)
            let msg = querystring.parse(dataBuffer);
            try{
              let  data =await PayProduct.findOne({_id:msg.appId},{url:1,token:1,adminUser:1,rate:1}).populate([{
                      path: 'url',
                      select: '_id url isAny channel tagPrice tag price timeOut'
                  }]).exec();
             // }

              if(data){
      
                if(getRequestKey(msg,data.token)==msg.key){
                  let index=-1;
                  let minPrice=100000000;
                  let isAnyIndex=-1;

                  //创建缓存
                  if(!PAYURL_CACHE[msg.appId])
                      PAYURL_CACHE[msg.appId]={}

                  //挑选合适二维码（离目标金额最近，定值二维码优先）
                  for (var i = 0; i < data.url.length; i++) {
        
                      if(data.url[i].channel==msg.channel&&!PAYURL_CACHE[msg.appId][data.url[i]._id]){
                      
                        if(data.url.isAny&& isAnyIndex<0){
                          isAnyIndex=i
                        }else if(data.url[i].tagPrice==msg.price){
                          let min= Math.abs(msg.price-data.url[i].tagPrice)
                          if(minPrice>min){
                            index=i;
                            minPrice=min;
                          }
                        }
                      }
                  }
                  if(index<0){//定值二维码 没有
                    if(isAnyIndex<0){//变值二维码 也没有
                        sendData.error= QRCodeError
                        sendData.msg= 'No valid QRCode Found'
                        res.end(JSON.stringify(sendData))
                        return 
                    }else{//使用变值二维码
                      index=isAnyIndex
                    }
                  }


                  //创建订单
                  if(index>=0){

                    //发送订单数据 
                    sendData.orderId=msg.orderId;
                    sendData.price=data.url[index].tagPrice
                    sendData.realPrice=data.url[index].price
                    sendData.timeOut=data.url[index].timeOut
                    sendData.isAny=data.url[index].isAny
                    sendData.qrCode=data.url[index].url
                    sendData.key=getSendQRCodeKey(sendData,data.token)

                    //存储订单数据
                      const obj = {
                          state: 0,
                          payProduct: msg.appId,
                          payUrl: data.url[index]._id,
                          adminUser: data.adminUser,
                          callBackUrl:msg.notifyUrl,
                          orderId: msg.orderId,
                      }
                     const newObj = new PayRecord(obj)
                     let info= await newObj.save()

                      //缓存订单数据
                     let takeOff=data.rate*data.url[index].price
                     takeOff=takeOff.toFixed(3)
                     const cacheData={
                       tag:data.url[index].tag,
                       notifyUrl:msg.notifyUrl,
                       token:data.token,
                       sendData:{
                          id:info._id,
                          orderId:msg.orderId,
                          uId:msg.uId,
                          goodsName:msg.goodsName,
                          income:data.url[index].price,
                          takeOff:takeOff,
                          code:0,
                          channel:data.url[index].channel,
                       }
                     }
                  PAYURL_CACHE[msg.appId][data.url[index]._id]=cacheData

                    //设置超时函数
                    // let time=sendData.timeOut*60*1000
                     let time=20*1000
                     let st=setTimeout(timeOutDel,time,msg.appId,data.url[index]._id)
                     TIMEOUT_CACHE[info._id]=st
                     //发送数据
                     res.end(JSON.stringify(sendData))
                  }
                }else{
                    sendData.error= KeyError
                    sendData.msg= 'key error!'
                    res.end(JSON.stringify(sendData))
                }
              }else {
                  sendData.error= InvalidAppId
                  sendData.msg=   'Invalid AppId: ' + msg.appId
                  res.end(JSON.stringify(sendData))
              }
            }catch (err) {
               console.log("--------------error_0")
               console.log(error)
            }

        });
    }else if(req.url==='/pay'&&req.method==='POST'){//app 回调
        let dataBuffer = '';
        req.on('data', function (chunk) {
            dataBuffer += chunk;
        });
        req.on('end', async function () {
            dataBuffer = decodeURI(dataBuffer)
            let msg = querystring.parse(dataBuffer);
            let  data =await PayProduct.findOne({_id:msg.appId},{token:1})
            if(data&&getAPPNotifyKey(msg,data.token)==msg.key){
              let cache=PAYURL_CACHE[msg.appId]
            
              for(let i in cache) {
                  if(cache[i].sendData.channel==msg.channel&&cache[i].tag==msg.tag&&cache[i].sendData.income==msg.price){
                    //清除定时器
                    clearTimeout(TIMEOUT_CACHE[cache[i].sendData.id])
                    //更新订单信息
                    try{
                        await PayRecord.findOneAndUpdate({_id: cache[i].sendData.id},{
                            $set: {
                              state:2,
                              takeOff:cache[i].sendData.takeOff,
                              flishDate:Date.now(),
                            }
                        });

                      //通知客户
                      cache[i].sendData.key=notifyMsg(cache[i].sendData,data.token)
                      Notify(cache[i].notifyUrl,cache[i].sendData)
                    //更新缓存
                      delete PAYURL_CACHE[msg.appId][i]
                       res.end(JSON.stringify({
                          code:0
                       }))

                      return 

                    }catch(error){
                       res.end(JSON.stringify({
                          code:1
                       }))
                      console.log("--------------------error1")
                      console.log(error)
                      return 
                    }
 
                  }
              }
              res.end(JSON.stringify({code:3}))
            }
        });
    }
});

//4.监听端口号
app.listen(setting.ListenPort, function () {
    console.log('支付服务器');
});
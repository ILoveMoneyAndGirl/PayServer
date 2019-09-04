
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
let ANYPAY_MIN={}


const InvalidAppId=0
const InvalidRoute=1
const NoPayUrl=2
const KeyError=3
const QRCodeError=4
const InsufficientBalance=5

const PostCount=0
const isAnyPriceChange=0.02
const isAnyMax=3

//2.创建服务器
let app = http.createServer();


function timeOutDel(appId,urlId,price) {
  //发送数据 表示超时
  let data= PAYURL_CACHE[appId][urlId]
  let sendData={}
  let token=""
  let notifyUrl=""

  if(data.isAny)
  {
    sendData=data[price].sendData
    token=data[price].token
    notifyUrl=data[price].notifyUrl
  }
  else
  {  
    sendData=data.sendData
    token=data.data
    notifyUrl=data.notifyUrl
  }

  sendData.code=1
  sendData.income=0
  sendData.takeOff=0
  sendData.key=notifyMsg(sendData,token)

  //通知客户

  Notify(notifyUrl,sendData)

  if(data.isAny)
     delete PAYURL_CACHE[appId][urlId][price]
  else
     delete PAYURL_CACHE[appId][urlId]
}

function cmp(a,b){
  return a.price-b.price
}

//获取任意价格二维码 定价
function getAnyPrice(price,appId,tag,channel){

  let priceData=PAYURL_CACHE[appId]
  price=parseFloat(price).toFixed(2)
  for(var i in priceData) {
      if(priceData[i].tag==tag&& priceData[i].channel==channel){

          if(priceData[i].isAny){
              if(priceData[i][price]){
                return getAnyPrice(price-isAnyPriceChange,appId,tag,channel)
              }

           }else if(priceData[i].sendData.income==price){
              return getAnyPrice(price-isAnyPriceChange,appId,tag,channel)
           }
      }
    }

    return price
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
        console.log("https:-->")
    }
    PostData(data,serverInfo.hostname,port,serverInfo.path,protocol,0)
}
function PostData (data,host,port,path,protocol,count){

    console.log("PostData----->")
  console.log(data,host,port,path)

  var content = JSON.stringify(data);

  var options = {
    hostname: host,
    port: port,
    path: path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json;charset=utf8',
     }
  };

  var req = protocol.request(options);
  req.on('error', function (e) {
    console.log("POST ERROR")
    console.log(e)
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

    //1.通过判断url路径和请求方式来判断是否是表单提交
    if (req.url === '/order' && req.method === 'POST') {//下单
        let dataBuffer = '';
        req.on('data', function (chunk) {
            // chunk 默认是一个二进制数据，和 data 拼接会自动 toString
            dataBuffer += chunk;
        });

        req.on('end', async function () {
            let  sendData={}
            dataBuffer = decodeURI(dataBuffer)
            let msg = JSON.parse(dataBuffer);
            console.log("ORDER:")
            console.log(msg)
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


                // //判断余额 是否能够下单
                // let userInfo=await AdminUserBalance.findOne({adminUser:data.adminUser})
                // if(userInfo.state==1)
                // {
                //     let now=new Date()
                //     let deadLine=userInfo.createDate
                //     deadLine.setDate(deadLine.getDate()+userInfo.tryDay);
                //     if((now-deadLine)>0&&(userInfo.money<-userInfo.tryAmountMoney))
                //     {
                //         sendData.error= InsufficientBalance
                //         sendData.msg= 'Insufficient Balance'
                //         res.end(JSON.stringify(sendData))
                //         return 
                //     }
                // }




                  //创建缓存
                  if(!PAYURL_CACHE[msg.appId])
                      PAYURL_CACHE[msg.appId]={}


                  //挑选合适二维码（离目标金额最近，定值二维码优先）
                  for (var i = 0; i < data.url.length; i++) {
                      
                      //需要处理
                      if(data.url[i].channel==msg.channel){
                      
                        if(data.url[i].isAny&& isAnyIndex<0){
                          isAnyIndex=i
                        }else if(data.url[i].tagPrice==msg.price&&!PAYURL_CACHE[msg.appId][data.url[i]._id]){
                          let min= Math.abs(data.url[i].tagPrice-data.url[i].price)
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
         
                    sendData.isAny=data.url[index].isAny

                    if(sendData.isAny){
                        let realPrice=getAnyPrice(msg.price-isAnyPriceChange,msg.appId,data.url[index].tag,data.url[index].channel)
                        realPrice=parseFloat(realPrice).toFixed(2)
                        sendData.price=msg.price
                        sendData.realPrice=realPrice

                        if(isAnyMax<(msg.price-realPrice)||realPrice<=0)
                        {
                            sendData.error= QRCodeError
                            sendData.msg= 'No valid QRCode Found'
                            res.end(JSON.stringify(sendData))
                            return 
                        }

                    }else
                    {
                      sendData.price=data.url[index].tagPrice
                      sendData.realPrice=data.url[index].price
                    }

                    sendData.qrCode=data.url[index].url
                    sendData.key=getSendQRCodeKey(sendData,data.token)

                      let takeOff=data.rate*sendData.realPrice
                     takeOff=parseFloat(takeOff).toFixed(3)


                    //存储订单数据
                      const obj = {
                          state: 0,
                          payProduct: msg.appId,
                          payUrl: data.url[index]._id,
                          adminUser: data.adminUser,
                          callBackUrl:msg.notifyUrl,
                          orderId: msg.orderId,
                          income:sendData.realPrice,
                          takeOff:takeOff,
                          goodsName:msg.goodsName,
                          uId:msg.uId,
                          appToken:data.token,
                          channel:data.url[index].channel,
                      }
                     const newObj = new PayRecord(obj)
                     let info= await newObj.save()

                     sendData.id=info._id

                      //缓存订单数据
                     const cacheData={
                       tag:data.url[index].tag,
                       notifyUrl:msg.notifyUrl,
                       token:data.token,
                       isAny:sendData.isAny,
                       channel:data.url[index].channel,
                       sendData:{
                          id:info._id,
                          orderId:msg.orderId,
                          uId:msg.uId,
                          goodsName:msg.goodsName,
                          income:sendData.realPrice,
                          takeOff:takeOff,
                          code:0,
                          channel:data.url[index].channel,
                       }
                     }
              
                    if(sendData.isAny)
                    {
                      if(!PAYURL_CACHE[msg.appId][data.url[index]._id])
                      {
                        PAYURL_CACHE[msg.appId][data.url[index]._id]={
                              tag:data.url[index].tag,
                              channel:data.url[index].channel,
                              isAny:sendData.isAny
                             }
                      }
                        PAYURL_CACHE[msg.appId][data.url[index]._id][sendData.realPrice]=cacheData
                    }else
                    {
                        PAYURL_CACHE[msg.appId][data.url[index]._id]=cacheData
                    }

                    //设置超时函数
                    // let time=sendData.timeOut*60*1000
                     //let time=20*1000
                      sendData.timeOut=data.url[index].timeOut*60*1000
                      //sendData.timeOut=20*1000
                     let st=setTimeout(timeOutDel,(sendData.timeOut+20*1000),msg.appId,data.url[index]._id,sendData.realPrice)
                     TIMEOUT_CACHE[info._id]=st
                     //发送数据
                    //  console.log("OrderData--------------->")
                    // console.log(JSON.stringify(sendData))
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
            }catch (error) {
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
            let msg = JSON.parse(dataBuffer);
            console.log("__________________> pay back--》")
            console.log(msg)
            let  data =await PayProduct.findOne({_id:msg.appId},{token:1})
                        console.log("__________________> pay back--》",data)

            if(data&&getAPPNotifyKey(msg,data.token)==msg.key){
              let cache=PAYURL_CACHE[msg.appId]
                                    console.log("__________________> pay back--》000")

              for(let i in cache) {
                  if(cache[i].channel==msg.channel&&cache[i].tag==msg.tag){

                    let orderId=""
                    let sendData=null
                    let notifyUrl=""
                    let 
                    if(cache[i].isAny){
                      let key=parseFloat(msg.price).toFixed(2)
                      if(cache[i][key]){
                          sendData=cache[i][key].sendData
                          notifyUrl=cache[i][key].notifyUrl
                      }
                    }
                    else if(cache[i].sendData.income==msg.price)
                    {
                        sendData=cache[i].sendData
                        notifyUrl=cache[i].notifyUrl
                    }
                    if(sendData)
                    {
                      //清除定时器
                      clearTimeout(TIMEOUT_CACHE[sendData.id])
                      //更新订单信息
                      try{
                          await PayRecord.findOneAndUpdate({_id: sendData.id},{
                              $set: {
                                state:2,
                                flishDate:Date.now(),
                              }
                          });

                        //通知客户
                        cache[i].sendData.key=notifyMsg(sendData,data.token)
                        Notify(notifyUrl,sendData)
                      //更新缓存
                      if(cache[i].isAny)
                           delete PAYURL_CACHE[msg.appId][i][msg.price]
                      else
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
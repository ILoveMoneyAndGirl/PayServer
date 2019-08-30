// //  var responseData={"callback":"","data":"","disptch":true,"msg":"","status":500};

// // var t=responseData
// // t.status=300
// // 	        console.log(t);
// // 	        console.log(responseData);

// const Common=require('./common.js')

// // console.log(Common.GetRandomNum(0,1))

// var d=[2,3,5,7,8,9,11,22,888,232,2123,345,678,891,3456,7412,3456,55,6,0,342]
// var index=[]
// for (var i = 0; i < 10; i++) {
// 	var f=Common.GetRandomNum(0,d.length-1)
// 	index[i]=d[f]
// 	d.splice(f, 1)
// }
 
//  console.log(index)
//    console.log(index.length)

// var url=require('url');
// var info=url.parse('http://www.vv.com:70/path/to/file?cc')
// if(info.port)
// 	console.log(1)
// else
// 	console.log(2)
// console.log(info)

// console.log(new Date())

// const {PayUrl,DB} = require('./models');

// PayUrl.aggregate([{"$group": {"_id": '$tag'}},{"$group": {"channel": '$channel'}},{"$group": {"tagPrice": '$tagPrice'}}]).exec(function(err,reslut){
//     console.log(reslut)
//  })

// PayUrl.aggregate([{"$group": {"_id": '$_id'}}]).exec(function(err,reslut){
//     console.log(reslut)
//  })


// PayUrl.find().sort({
//                 tagPrice:1,price:1
//             }).exec(function(err,reslut){
//     console.log(reslut)
//  })

let s='{"newData":{"price":"5","days":"1","des":"试用会员"},"action":"AddGoods"}'

console.log(s.length)
 // PayUrl.collection.group(
 //    group.tag,
 //    group.channel,
 //    group.tagPrice,
 //    true,
 //    function(err, reslut) {
 //        console.log("result====",reslut)
 //    })

// console.log(PayUrl.aggregate())

// DB.PayUrl.pretty()([])
// DB.collection("PayUrl").find(function(err,data)
//  {
//  	 	console.log(err)

//  	console.log(data)
//  })


// console.log(DB.collection().models)

// DB.collection("PayUrl").find({},(err,data)=>
// {
// 	console.log(data)
// })

    // DB.collection("PayUrl").count({}).then(function(count){
    //     console.log(count);
    //    // db.close();
    // });
// DB.PayUrl.find(function(err,data)
// {
// 	console.log(data)
// })
var ws = require("nodejs-websocket");
var logic=require('./logic.js')

var server = ws.createServer(function(conn){
    // conn.on("open",function(arg)
    // {
    // });
    conn.on("text", function (str) {

     var data=logic.LogicDel(JSON.parse(str))
     conn.sendText(JSON.stringify(data))
    })
    conn.on("close", function (code, reason) {
        console.log("关闭连接")
    });
    conn.on("error", function (code, reason) {
        console.log("异常关闭")
    });
}).listen(8001)
console.log("socketSever running at http://127.0.0.1:8001/")
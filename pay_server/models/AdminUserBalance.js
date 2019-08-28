var mongoose = require('mongoose');
var shortid = require('shortid');
var Schema = mongoose.Schema;


var AdminUserBalanceSchema = new Schema({
    _id: {
        type: String,
        'default': shortid.generate
    },
    money:Number, //余额
    createDate: Date,
    adminUser: String,
    tryMinute: Number,

    tryAmountMoney: Number,//试用金额,
    state:Number,// 0永久免费，1普通用户
    
});


var AdminUserBalance = mongoose.model("AdminUserBalance", AdminUserBalanceSchema);
module.exports = AdminUserBalance;
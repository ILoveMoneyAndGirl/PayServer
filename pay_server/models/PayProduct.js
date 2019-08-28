/**
 * Created by Administrator on 2017/4/15.
 * 产品
 */
var mongoose = require('mongoose');
var shortid = require('shortid');
var Schema = mongoose.Schema;
var PayUrl = require('./PayUrl');

var PayProductSchema = new Schema({
    _id: {
        type: String,
        'default': shortid.generate
    },
    token:String,
    name: String,//名称
    adminUser: String,

    api: String,

    rate:Number,

    url: [{
        type: String,
        ref: "PayUrl"
    }]
});

var PayProduct = mongoose.model("PayProduct", PayProductSchema);
module.exports = PayProduct;





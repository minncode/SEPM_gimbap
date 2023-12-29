const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
    email: {
        type: String, 
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    amount: {
        type: String, 
        required: true,
    },
    remainingBalance: {
        type: String, 
    },
    paymentStatus: {
        type: String, 
    },
    paymentDate: {
        type: Date, 
        default: Date.now, 
    },
    adminNote: {
        type: String, 
    },
});

paymentRecordSchema.virtual('paymentDateInVietnam').get(function () {
    return this.paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
});

const PaymentRecord = mongoose.model('paymentRecords', paymentRecordSchema);

module.exports = PaymentRecord;
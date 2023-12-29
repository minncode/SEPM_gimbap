const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
    email: {
        type: String, // 사용자를 식별할 수 있는 고유한 ID (예: MongoDB의 ObjectId)
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    amount: {
        type: String, // 금액은 숫자로 저장하는 것이 일반적
        required: true,
    },
    remainingBalance: {
        type: String, // 남은 잔액
    },
    paymentStatus: {
        type: String, // 결제 상태 (예: "성공", "보류", "취소" 등)
    },
    paymentDate: {
        type: Date, // 결제 일자 및 시간
        default: Date.now, // 기본값으로 현재 일시 설정
    },
    adminNote: {
        type: String, // 어드민이 추가하는 메모 또는 설명
    },
});

paymentRecordSchema.virtual('paymentDateInVietnam').get(function () {
    return this.paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
});

const PaymentRecord = mongoose.model('paymentRecords', paymentRecordSchema);

module.exports = PaymentRecord;
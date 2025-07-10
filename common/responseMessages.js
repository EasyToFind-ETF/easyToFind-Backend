/*
응답메세지 모듈
*/

const responseMessage = {
  success: {
    delete: { status: 200, success: true, message: "삭제 성공" },
    modify: { status: 200, success: true, message: "수정 성공" },
    read: { status: 200, success: true, message: "조회 성공" },
    create: { status: 200, success: true, message: "생성 성공" },
  },
  fail: {
    delete: { status: 400, success: false, message: "삭제 실패" },
    modify: { status: 400, success: false, message: "수정 실패" },
    read: { status: 400, success: false, message: "조회 실패" },
    create: { status: 400, success: false, message: "생성 실패" },
  },
};

module.exports = responseMessage;

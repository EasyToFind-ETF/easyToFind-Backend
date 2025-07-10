/**
 * API 응답값 통일하기 위해 사용하는 Response 클래스
 */

class Response {
  constructor(status, message, data = "data is optional") {
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

const response = {
  successResponse: (status, message, data) => {
    return new Response(status, message, data);
  },

  failResponse: (status, message, data) => {
    return new Response(status, message, data);
  },
};

module.exports = response;

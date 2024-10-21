const messageFields = {
    $set: {
      user: "", 
      message: "",
      created: Date.now(),
      edited: [],
    },
  };
  
  module.exports = {
    messageFields
  };
  
const messageFields = {
    $set: {
      user: null, 
      message: "",
      created: Date.now(),
      edited: [],
    },
  };
  
  module.exports = {
    messageFields
  };
  
const express = require(__dirname + '/backend/node_modules/express');
const router = require(__dirname + '/backend/routes/drive.js');

console.log("Exported router stack:");
router.stack.forEach(layer => {
  if (layer.route) {
    console.log(layer.route.stack[0].method, layer.route.path);
  }
});

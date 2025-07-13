// Test case to demonstrate browser bug with new Request() and FormData
/* global console, File, FormData, Request */

const file = new File(["test content"], "test.txt", { type: "text/plain" });
const formData = new FormData();
formData.append("file", file);

const request = new Request("https://example.com/upload", {
  body: formData,
  method: "POST",
});

console.log(request.body); // ReadableStream, not FormData!

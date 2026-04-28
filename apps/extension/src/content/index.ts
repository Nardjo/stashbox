import { Readability } from "@mozilla/readability";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "EXTRACT_CONTENT") return;

  const article = new Readability(document.cloneNode(true) as Document).parse();
  sendResponse({
    title: article?.title ?? document.title,
    content: article?.textContent ?? "",
    url: window.location.href,
  });

  return true;
});

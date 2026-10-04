// Conservative fast paths: ambiguous design ideas still reach the model.
// These are cost controls, not a complete semantic or security classifier.
const REDIRECT = 'I can help with cake designs. What would you like to change?';
const normalize = text => text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();

function getLocalCakeAiReply(messages) {
  const content = messages.at(-1)?.content;
  // Never intercept tool-result continuations or image descriptions.
  if (typeof content !== 'string') return null;
  const text = normalize(content);
  if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening))[!.\s]*$/i.test(text)) {
    return 'Hi! What cake would you like to design?';
  }
  if (/^(?:thanks|thank you|thank you very much|salamat|ok|okay|great|nice)[!.\s]*$/i.test(text)) {
    return 'You’re welcome! Tell me if you want another cake change.';
  }
  if (/^(?:how are you|what can you do|who are you)[?.!\s]*$/i.test(text)) {
    return 'I help customize cake colors, decorations, borders, lettering, and flavors.';
  }
  // Allow decoration wording/themes (e.g. a football cake or text saying
  // "What's the weather?") before matching off-topic questions.
  if (/\b(?:cake|frosting|icing|glaze|tier|topper|border|piping|decorations?|lettering|fondant|buttercream|reference|theme|text)\b/i.test(text)) return null;
  if (/^(?:[\W_\d]+|(?:asdf|qwerty|blah|test|testing|random)(?:[\s!?.,]|$).*)$/i.test(text)
      || /^(?:asdf[ghjkl]*|qwerty[uiop]*)[!.\s]*$/i.test(text)
      || /^([a-z])\1{4,}[!.\s]*$/i.test(text)
      || /\b(?:weather|stock prices?|crypto prices?|politics|president|prime minister|capital of|news today)\b/i.test(text)
      || /\b(?:tell|write|give)\b.{0,25}\b(?:joke|essay|story|poem|recipe|workout)\b/i.test(text)
      || /\b(?:translate|summarize)\b/i.test(text)
      || /\b(?:what is|what's|calculate|solve)\s+\d+\s*[+*/=]\s*\d+/i.test(text)) return REDIRECT;
  return null;
}

module.exports = { getLocalCakeAiReply };

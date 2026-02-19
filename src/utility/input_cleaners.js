

module.exports.cleanInput = (text) => { return text.replace(/[^a-zA-Z0-9_]/g, ""); }

module.exports.cleanIntegerInput = (input) => {
	const cleaned = input.replace(/[^0-9]/g, "");
	return cleaned.length === 0 ? null : parseInt(cleaned, 10);
}
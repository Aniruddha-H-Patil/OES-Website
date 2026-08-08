// Strictly converts incoming strings to PostgreSQL ISO DATE format (YYYY-MM-DD)
function sanitizeDobToDateType(dobStr) {
    if (!dobStr) return null;
    let cleanStr = String(dobStr).trim().replace(/\//g, '-');

    // Case 1: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return isNaN(Date.parse(cleanStr)) ? null : cleanStr;
    }

    // Case 2: DDMMYYYY format (15082005 -> 2005-08-15)
    if (/^\d{8}$/.test(cleanStr)) {
        const day = cleanStr.slice(0, 2);
        const month = cleanStr.slice(2, 4);
        const year = cleanStr.slice(4, 8);
        const isoDate = `${year}-${month}-${day}`;
        return isNaN(Date.parse(isoDate)) ? null : isoDate;
    }

    return null;
}

module.exports = {
    sanitizeDobToDateType
};
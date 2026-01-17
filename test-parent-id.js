// Quick test to verify parent ID extraction logic
const testIds = [
    50810082, // Jahnplatz Steig 82
    54570082, // Prießallee Steig 82
    52720082, // Jahnplatz parent with suffix
    5272,     // Direct parent ID
];

testIds.forEach(id => {
    const parentId = id > 100000 ? Math.floor(id / 10000) : id;
    console.log(`ORT_NR: ${id} -> Parent: ${parentId}`);
});

// Expected output:
// ORT_NR: 50810082 -> Parent: 5081  ✓
// ORT_NR: 54570082 -> Parent: 5457  ✓
// ORT_NR: 52720082 -> Parent: 5272  ✓
// ORT_NR: 5272 -> Parent: 5272      ✓

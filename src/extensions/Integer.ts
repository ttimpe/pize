interface Number {
    toIBISHexString(): string
}
Number.prototype.toIBISHexString = function(): string {
    return String.fromCharCode(48 + this)
}
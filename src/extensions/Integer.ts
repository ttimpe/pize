interface Number {
    toIBISHexString(): string
}
Number.prototype.toIBISHexString = function(): string {
    return String.fromCharCode(47 + this)
}
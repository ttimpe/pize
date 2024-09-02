interface String {
    hexLength(): string
    replaceAll(search: string, replace: string): string
    toIBISUppercase(): string
}
String.prototype.hexLength = function(): string {
    const numberOfBlocks = Math.round(String(this).length / 16)
    return numberOfBlocks.toString(16).toUpperCase()
}
String.prototype.replaceAll = function (search: string, replace: string): string {
    return this.split(search).join(replace)
}

String.prototype.toIBISUppercase = function(): string {
    let output = this.replaceAll("ß", "ẞ");
    output = output.toUpperCase()
    output = output.replaceAll("ẞ", "ß");
    return output;
}
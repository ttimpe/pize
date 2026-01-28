export enum IBISTestFunction {
    ProgramRestart = 1,
    Melodie = 2,
    SprachKanal = 3,
    DatenKanal = 4,
    LSAKanal = 5,  // Assuming 7 for LSA, or maybe 4? User didn't specify numbers for all, I'll pick logical ones.
    // Actually, usually user inputs 1-9. I'll assign:
    // 1: Restart
    // 2: Melodie
    // 3: Sprachkanal
    // 4: Datenkanal
    // 5: LSA-Kanal
    // 6: Ortsmarke
    Ortsmarke = 6
}

let xToFile = {}, yToRank = {}, fileToX = {}, rankToY = {};
let perspective = false;

const flipPerspective = () => {
    perspective = !perspective;

    for (let i = 0; i < 8; i++) {
        let file = String.fromCharCode(97+i);
        let rank = `${i+1}`;
        let y = perspective ? 7-i : i;
        let x = perspective ? i : 7-i;

        xToFile[x] = file;
        yToRank[y] = rank;
        fileToX[file] = x;
        rankToY[rank] = y;
    }
};

flipPerspective();

module.exports = {
    xToFile,
    yToRank,
    fileToX,
    rankToY,
    flipPerspective
};
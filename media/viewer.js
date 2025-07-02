const vscode = acquireVsCodeApi();
let filePath = null;
let rawData = null;
let dims = null; // начальные размеры


function checkSize() {
    const dimX = parseInt(document.getElementById("dimX").value);
    const dimY = parseInt(document.getElementById("dimY").value);
    const dimZ = parseInt(document.getElementById("dimZ").value);
    const dtype = document.getElementById("dtype").value;

    if (!filePath) {
    document.getElementById("checkResult").textContent = "Сначала выберите файл.";
    return;
    }

    vscode.postMessage({
    command: "checkRawSize",
    path: filePath,
    dims: [dimX, dimY, dimZ],
    dtype: dtype
    });
}

document.getElementById("selectRaw").addEventListener("click", () => {
    vscode.postMessage({ command: "selectRawFile" });
});

document.getElementById("loadRaw").addEventListener("click", () => {
    dims = [
    parseInt(document.getElementById("dimX").value),
    parseInt(document.getElementById("dimY").value),
    parseInt(document.getElementById("dimZ").value),
    ];
    if (!filePath) return alert("Сначала выберите .raw файл");

    vscode.postMessage({
    command: "loadRawData",
    path: filePath,
    dims: dims,
    });
});

document.getElementById("zSlider").addEventListener("input", (e) => {
    const z = parseInt(e.target.value);
    document.getElementById("zValue").textContent = z;
    drawSliceZ(z);
});
function drawSliceZ(z) {
    if (!rawData) return;
    const [x, y, zmax] = dims;
    const sliceSize = x * y;
    const offset = z * sliceSize;
    console.log("Получен rawData, длина:", rawData.length, "dims:", dims);

    const canvas = document.getElementById("sliceCanvas");
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(x, y);

    let min = 255;
    let max = 0;
    for (let i = 0; i < sliceSize; i++) {
    const val = rawData[offset + i];
    if (val < min) min = val;
    if (val > max) max = val;
    }
    const range = max - min || 1;
    for (let i = 0; i < sliceSize; i++) {
    const val = rawData[offset + i];
    const norm = Math.round(((val - min) / range) * 255);
    const j = i * 4;
    imageData.data[j + 0] = norm;
    imageData.data[j + 1] = norm;
    imageData.data[j + 2] = norm;
    imageData.data[j + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    console.log("Z=\${z}, min=\${min}, max=\${max}");
}

document.getElementById("checkSize").addEventListener("click", () => {
    console.log("Проверка размера .raw файла");
    checkSize();
});
document.getElementById("dimX").addEventListener("input", checkSize);
document.getElementById("dimY").addEventListener("input", checkSize);
document.getElementById("dimZ").addEventListener("input", checkSize);
document.getElementById("dtype").addEventListener("change", checkSize);

window.addEventListener("message", (event) => {
    const message = event.data;

    if (message.command === "selectedFile") {
    filePath = message.path;
    document.getElementById("filePath").textContent = "Выбран файл: " + message.path;
    checkSize(); // запускаем проверку сразу
    }
    if (message.command === "rawDataLoaded") {
    console.log("Получены данные .raw, длина:", message.base64.length, "dims:", message.dims);
    const binary = atob(message.base64);
    rawData = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        rawData[i] = binary.charCodeAt(i);
    }

    dims = message.dims;
    document.getElementById("zSlider").max = dims[2] - 1;
    document.getElementById("slicer").style.display = "block";
    drawSliceZ(0);
    }

    if (message.command === "checkResult") {
    console.log("Результат проверки размера:", message.result);
    document.getElementById("checkResult").textContent = message.result;
    }
});
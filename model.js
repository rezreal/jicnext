import "./tf.min.js";

export const [modelWeight, modelHeight] = [320, 320];
const weights = "./web_model/model.json";
export const model = await tf.loadGraphModel(weights);

const names = ["BELLYEXPOSED",
    "BELLYCOVERED",
    "BUTTOCKSEXPOSED",
    "BUTTOCKSCOVERED",
    "FEMALEBREASTEXPOSED",
    "FEMALEBREASTCOVERED",
    "FEMALEGENITALIAEXPOSED",
    "FEMALEGENITALIACOVERED",
    "MALEGENITALIACOVERED",
    "MALEGENITALIAEXPOSED",
    "MALEBREASTEXPOSED",
    "MALEBREASTCOVERED",
    "FACEFEMALE",
    "FACEMALE",
    "FEETCOVERED",
    "FEETEXPOSED",
    "ARMPITSCOVERED",
    "ARMPITSEXPOSED",
    "ANUSCOVERED",
    "ANUSEXPOSED"]

/**
 * Scans pixels and draws captioned boxes around scores.
 * @param pixels
 * @param canvas {HTMLCanvasElement}
 * @param context2d {CanvasRenderingContext2D}
 * @returns {Promise<void>}
 */
export async function drawDetections(pixels, context2d) {

    const res = await processImage(pixels);

    res.forEach(hit => {

        const naturalWidth = context2d.canvas.width;
        const naturalHeight = context2d.canvas.height;
        let [x1, y1, x2, y2] = hit.box;
        const score = hit.score.toFixed(2);
        if (score < 0.5) return;


        const klass = hit.class;
        x1 *= naturalWidth;
        x2 *= naturalWidth;
        y1 *= naturalHeight;
        y2 *= naturalHeight;
        let x = Math.ceil(x1);
        let y = Math.ceil(y1);
        let w = Math.ceil(x2 - x1);
        let h = Math.ceil(y2 - y1);
        console.info(`${x} ${y} ${w} ${h}`)


        context2d.font = "14px sans-serif";
        context2d.textBaseline = "top";
        context2d.strokeStyle = "#00FFFF";
        context2d.lineWidth = 4;
        context2d.strokeRect(x, y, w, h);
        context2d.fillStyle = "#00FFFF";
        const textWidth = 12 * (klass.length + 1 + (score.toString()).length);
        const textHeight = 16;
        context2d.fillRect(x, y, textWidth + 4, textHeight + 4);
        context2d.fillStyle = "#000000";
        context2d.fillText(klass + ":" + score, x1, y1);
    });

}


export async function processImage(pixels) {
    const tfObj = tf.browser.fromPixels(pixels);
    const input = tf.image.resizeBilinear(tfObj, [modelWeight, modelHeight])
    const inputDiv = input.div(255);
    const expandDims = inputDiv.expandDims(0);
    const res = await model.executeAsync(expandDims);
    const [boxes_res, scores_res, classes_res, valid_detections_res] = res;
    const valid_detections_count = (valid_detections_res.dataSync())[0];
    const classes =  classes_res.dataSync().slice(0, valid_detections_count);
    const boxes = boxes_res.dataSync();
    const scores = scores_res.dataSync().slice(0, valid_detections_count);

    boxes_res.dispose();
    scores_res.dispose();
    classes_res.dispose();
    valid_detections_res.dispose();
    tfObj.dispose();
    input.dispose();
    inputDiv.dispose();
    expandDims.dispose();

    return Array.from(scores).map((e,i) => ({
        box: boxes.slice(i * 4, (i + 1) * 4),
        class: names[classes[i]],
        score: e
    }))

}


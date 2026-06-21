
import * as real from "./manuscripts.real";
import * as mock from "./manuscripts.mock";

const flag = String(import.meta.env.VITE_USE_REAL_UPLOAD ?? "").trim().toLowerCase();
const useReal = flag === "true" || flag === "1" || flag === "yes";

console.log(
  `[API] modo = ${useReal ? "REAL (backend)" : "MOCK (datos simulados)"}`,
);

export const getUploadUrl = useReal ? real.getUploadUrl : mock.getUploadUrl;
export const uploadFileToStorage = useReal ? real.uploadFileToStorage : mock.uploadFileToStorage;
export const getManuscriptStatus = useReal ? real.getManuscriptStatus : mock.getManuscriptStatus;
export const getManuscriptResults = useReal ? real.getManuscriptResults : mock.getManuscriptResults;
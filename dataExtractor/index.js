import { firebaseConfig, collectionName, outputFile } from "./config.js";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import fs from "fs";

function escapeCSV(value) {
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)) {
        return value.map(escapeCSV).join(",");
    }

    const str = String(value);

    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

function convertToCSV(docs) {
    const maxJobs = docs.reduce(
        (max, doc) => Math.max(max, Array.isArray(doc.selectedJobs) ? doc.selectedJobs.length : 0),
        0
    );

    const jobHeaders = Array.from({ length: maxJobs }, (_, i) => `job_${i + 1}`);

    const headers = [
        "id",
        "firstName",
        "lastName",
        "ageGroup",
        "jobTime",
        "hasJobAlready",
        "details",
        ...jobHeaders,
    ];

    const rows = docs.map((doc) => {
        const jobs = Array.isArray(doc.selectedJobs) ? doc.selectedJobs : [];

        const jobCells = Array.from({ length: maxJobs }, (_, i) =>
            escapeCSV(jobs[i] ?? "")
        );

        return [
            escapeCSV(doc.id),
            escapeCSV(doc.firstName),
            escapeCSV(doc.lastName),
            escapeCSV(doc.ageGroup),
            escapeCSV(doc.jobTime),
            escapeCSV(doc.hasJobAlready),
            escapeCSV(doc.details),
            ...jobCells,
        ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
}

async function downloadCollectionToCSV() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();

    console.log(`⏳ Fetching collection "${collectionName}" …`);

    try {
        const snapshot = await db.collection(collectionName).get();

        if (snapshot.empty) {
            console.warn("⚠️  Collection is empty – nothing to export.");
            return;
        }

        const docs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }));

        console.log(`✅ Downloaded ${docs.length} document(s).`);

        const csv = convertToCSV(docs);

        const BOM = "\uFEFF";
        fs.writeFileSync(outputFile, BOM + csv, "utf8");

        console.log(`💾 Saved to "${outputFile}".`);
    } catch (error) {
        console.error("❌ Error fetching collection:", error);
        process.exit(1);
    }
}

downloadCollectionToCSV();
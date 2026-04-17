import { firebaseConfig } from "/firebaseConfig.js"

document.addEventListener("DOMContentLoaded", async () => {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const optionsContainer = document.querySelector(".search-options");
    const searchBox = document.querySelector(".search");
    const jobForm = document.getElementById("job-form")
    const ageGroupForm = document.getElementById("ageGroupForm")
    const jobOptions = document.getElementById("job-options")
    const hasJobCheckbox = document.getElementById("hasJobCheckbox")
    const samoajaInfo = document.getElementById("samoajaInfo")
    const adultInfo = document.getElementById("adultInfo")
    let selectedJobs = [];
    let hasJobCheckboxChecked = false

    let jobs = {};
    try {
        const response = await fetch("jobs.json");
        jobs = await response.json();
    } catch (err) {
        console.error("Error loading JSON:", err);
        alert("Ongelma pestien latauksessa. Uudelleenlataa sivusto. Jos ongelma ei ratkea, ota yhteyttä aaro.heroja@partio.fi")
    }

    const loadJobs = (group) => {
        optionsContainer.innerHTML = "";

        if (!jobs[group]) return;

        jobs[group].forEach(job => {
            const div = document.createElement("div");
            div.classList.add("search-option");
            div.innerHTML = `${job}`;
            optionsContainer.appendChild(div);

            div.addEventListener("click", () => {
                const index = selectedJobs.indexOf(job);

                if (index !== -1) {
                    selectedJobs.splice(index, 1);
                    div.classList.remove("selected");
                    return;
                }

                const jobLength = getMaxJobSelectionLength(group)

                if (selectedJobs.length >= jobLength) {
                    alert(`Olet jo valinnut ${jobLength} pestitoivetta. Valitse jokin pestitoive pois, että voi valita kyseisen pesti toiveeksi.`)
                    return
                }

                selectedJobs.push(job);
                div.classList.add("selected");
            });
        });
    }

    const getMaxJobSelectionLength= (ageGroup) => {
        if (ageGroup === "samoaja") {
            return 10
        }

        if (ageGroup === "vaeltaja" || ageGroup === "aikuinen") {
            return 5
        }

        alert("Lomakkeen lataamisessa oli ongelma. Yritä avata lomake uudelleen. Jos ongelma ei ratkea, ota yhteyttä aaro.heroja@partio.fi")
        return 6700
    }

    const radios = document.querySelectorAll('input[name="agegroup"]');
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            jobForm.classList.remove("hidden")

            selectedJobs = [];
            loadJobs(radio.value);

            if (radio.value === "vaeltaja" || radio.value === "aikuinen") {
                if (!hasJobCheckboxChecked) {
                    jobOptions.classList.add("hidden")
                    samoajaInfo.classList.add("hidden")
                    adultInfo.classList.remove("hidden")
                }

                return
            }

            if (radio.value === "samoaja") {
                if (!hasJobCheckboxChecked) {
                    jobOptions.classList.remove("hidden")
                    adultInfo.classList.add("hidden")
                    samoajaInfo.classList.remove("hidden")
                }

                return
            }
        });
    });

    searchBox.addEventListener("input", () => {
        const query = searchBox.value.toLowerCase();

        optionsContainer.childNodes.forEach(opt => {
            const text = opt.textContent.toLowerCase();
            opt.hidden = !text.includes(query);
        });
    })

    hasJobCheckbox.addEventListener("change", () => {
        if (hasJobCheckbox.checked) {
            hasJobCheckboxChecked = true
            jobOptions.classList.add("hidden");
            searchBox.classList.add("hidden")
            optionsContainer.classList.add("hidden")
            samoajaInfo.classList.add("hidden");
            adultInfo.classList.add("hidden");
        } else {
            hasJobCheckboxChecked = false

            const ageGroup = document.querySelector('input[name="agegroup"]:checked')?.value;
            searchBox.classList.remove("hidden")
            optionsContainer.classList.remove("hidden")

            if (ageGroup === "samoaja") {
                jobOptions.classList.remove("hidden");
                samoajaInfo.classList.remove("hidden");
                adultInfo.classList.add("hidden");
            } else if (ageGroup === "vaeltaja" || ageGroup === "aikuinen") {
                jobOptions.classList.add("hidden");
                samoajaInfo.classList.add("hidden");
                adultInfo.classList.remove("hidden");
            }
        }
    });

    jobForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const ageGroup = document.querySelector('input[name="agegroup"]:checked')?.value
        const jobTime = document.querySelector('input[name="jobtime"]:checked')?.value

        if (ageGroup === undefined) {
            alert("Muista täyttää kaikki lomakkeen pakolliset kohdat, jotka huomaat tähdistä *")
            return
        }

        if (ageGroup === "samoaja" && jobTime === undefined && !hasJobCheckboxChecked) {
            alert("Muista täyttää kaikki lomakkeen pakolliset kohdat, jotka huomaat tähdistä *")
            return
        }

        const maxJobLength = getMaxJobSelectionLength(ageGroup)

        if (selectedJobs.length < maxJobLength && !hasJobCheckboxChecked) {
            alert(`Et ole vielä valinnut ${maxJobLength} pestitoivetta. Valitse ${maxJobLength} pestitoivetta ja uudelleenpalauta lomake.`)
            return
        }

        const data = {
            firstName: document.getElementById("firstName").value,
            lastName: document.getElementById("lastName").value,
            ageGroup: ageGroup,
            jobTime: jobTime || "",
            selectedJobs: selectedJobs,
            hasJobAlready: hasJobCheckboxChecked,
            details: document.getElementById("details").value
        };

        try {
            await db.collection("jobSelections").add(data);
            alert("Pestivalintasi lähetetty onnistuneesti!");
            jobForm.reset();
            ageGroupForm.reset()
            optionsContainer.innerHTML = "";
            selectedJobs = [];
            hasJobCheckboxChecked = false

            jobForm.classList.add("hidden")
            searchBox.classList.remove("hidden")
            optionsContainer.classList.remove("hidden")
        } catch (error) {
            console.error("Error writing document: ", error);
            alert("Jotain meni pieleen, yritä uudelleen.");
        }
    });
})

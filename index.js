const fs = require("fs");
const path = require("path");
const stdin = (function() {
    let is_stdin_finished = false;
    let resolve_stdin = null;
    let reject_stdin = null;
    let got_stdin_finished;

    function onData(chunk) {
        if (!resolve_stdin) {
            last_stdin = chunk;
            return;
        }
        let f = resolve_stdin;
        resolve_stdin = null;
        reject_stdin = null;
        process.stdin.pause();
        process.stdin.end();
        process.stdin.removeAllListeners("data");
        process.stdin.removeAllListeners("end");
        f(chunk);
        return;
    }

    function onEnd() {
        if (is_stdin_finished === false) {
            is_stdin_finished = true;
            if (resolve_stdin) {
                let f = resolve_stdin;
                resolve_stdin = null;
                reject_stdin = null;
                got_stdin_finished = true;
                process.stdin.pause();
                process.stdin.end();
                process.stdin.removeAllListeners("data");
                process.stdin.removeAllListeners("end");
                f(chunk);
            }
            return;
        }
        console.warn("Stdin ended again unexpectedly");
    }

    /**
     * Resolves when there's data in the stdin
     * @returns {Promise<Buffer>}
     */
    function stdin() {
        process.stdin.resume();
        return new Promise((resolve, reject) => {
            if (is_stdin_finished) {
                if (got_stdin_finished) {
                    reject(new Error("Requested stdin even after getting null"));
                    return;
                }
                got_stdin_finished = true;
                resolve(null);
                return;
            }
            process.stdin.on('data', onData);
            process.stdin.on('end', onEnd);
            resolve_stdin = resolve;
            reject_stdin = reject;
        });
    };

    return stdin;
})();

function print_file_does_not_exist() {
    const fileName = path.basename(file);
    if (!fileName || !fileName[0]) {
        console.log("Could not determine basename of file parameter");
        process.exit(1);
    }

    console.log("File does not exist");
    try {
        const parent = path.dirname(file);
        if (!fs.existsSync(parent)) {
            console.log(`Folder: ${parent}`);
            console.log("Folder does not exist");
        } else {
            let letter = fileName[0];
            const similar = fs.readdirSync(file).filter(
                alternative => alternative[0] === letter
            );
            if (similar.length === 0) {
                return;
            }
            console.log(`Folder: ${parent}`);
            console.log(`Contains the following file${similar.length === 1 ? "" : "s"} that start${similar.length === 1 ? "s" : ""} with the same letter as the input (${letter}): `);
            console.log(similar);
            return;
        }
    } catch (err) {
        // Do nothing as this is just helping the user
    }
    process.exit(1);
}

function get_date_time_from_file(file) {
    try {
        const stats = fs.statSync(file);
        const dateObject = stats.mtime;
        const timeZoneHours = dateObject.getTimezoneOffset() / 60;
        dateObject.setTime(dateObject.getTime() - timeZoneHours * 3600 * 1000);
        const [old_date, old_time] = dateObject.toISOString().substring(0, 19).replace(/\-/g, "/").split("T");
        return [old_date, old_time, stats];
    } catch (err) {
        console.log("Could not retrieve date time from file at " + file);
        process.exit(1);
    }
}

(async function() {
    const file = process.argv[2];

    if (!file) {
        return console.log("Missing file parameter");
    }

    console.log(`File: ${file}`);

    if (!fs.existsSync(file)) {
        return print_file_does_not_exist();
    }

    const [old_date, old_time, _initial_stats] = get_date_time_from_file(file);

    const expected_date_length = old_date.length;
    const expected_time_length = old_time.length;

    let new_date;
    while (true) {
        process.stdout.write(`Date [${old_date}]: `);
        let raw_input = await stdin();
        if (raw_input instanceof Buffer) {
            raw_input = raw_input.toString("utf8");
        }
        if (typeof raw_input !== "string") {
            console.warn("Raw input expected to be string, got ", typeof raw_input);
            raw_input = "";
        }
        if (raw_input.trim() === "") {
            new_date = old_date;
        } else {
            new_date = raw_input.trim();
        }
        if (new_date.length !== expected_date_length) {
            console.log("Date must have", expected_date_length, "characters, got", new_date.length);
            continue;
        }
        const is_first_separator_invalid = new_date[4] !== '/' && new_date[4] !== '-';
        if (is_first_separator_invalid) {
            console.log(`Date format must be "yyyy/mm/dd" or "yyyy-mm-dd", got "${new_date}" (first separator contains "${new_date[4]}" instead)`);
            continue;
        }
        const is_second_separator_invalid = new_date[7] !== '/' && new_date[7] !== '-';
        if (is_second_separator_invalid) {
            console.log(`Date format must be "yyyy/mm/dd" or "yyyy-mm-dd", got "${new_date}" (first separator contains "${new_date[7]}" instead)`);
            continue;
        }
        if (new_date.replace(/\-/g, "/").split("/").map(str => parseInt(str)).some(value => isNaN(value) || value < 0)) {
            console.log(`Date components must be numeric, got "${new_date}"`);
            continue;
        }
        break;
    }

    let new_time;
    while (true) {
        process.stdout.write(`Time [${old_time}]: `);
        let raw_input = await stdin();
        if (raw_input instanceof Buffer) {
            raw_input = raw_input.toString("utf8");
        }
        if (typeof raw_input !== "string") {
            console.warn("Raw input expected to be string, got ", typeof raw_input);
            raw_input = "";
        }
        if (raw_input.trim() === "") {
            new_time = old_time;
        } else {
            new_time = raw_input.trim();
        }
        // some keyboard have trouble typing colons so lets fix some alternatives
        if (new_time.includes("?")) {
            new_time = new_time.replace(/\?/g, ":");
        }
        if (new_time.includes(" ")) {
            new_time = new_time.replace(/\ /g, ":");
        }
        if (new_time.length !== expected_time_length) {
            console.log("Time must have", expected_time_length, "characters, got", new_time.length);
            continue;
        }
        if (new_time[2] !== ':' || new_time[5] !== ':') {
            console.log("Time format must be \"hh:mm:dd\". Time components are separated by colons (:)");
            continue;
        }
        if (new_time.split(":").map(str => parseInt(str)).some(value => isNaN(value) || value < 0 || value > 60)) {
            console.log("Time components must be numeric and less than 60");
            continue;
        }
        break;
    }
    // Since there has been some time since the user gave us his date desires
    // It could be that the file time changed
    // If it did, we can't tell him that he didn't do anything and not do anything
    // because he expects this thing to set the date, not conditionally check if it is necessary.
    const [new_old_date, new_old_time, previous_stats] = get_date_time_from_file(file);

    if (new_old_date === new_date && new_old_time === new_time) {
        console.log(`File date time is ${new_date} ${new_time}`);
        console.log("Press Enter");
        await stdin();
        return process.exit(0);
    }

    const mtime = new Date([new_date, new_time].join(" "));
    mtime.setTime(mtime.getTime() - 0 * (mtime.getTimezoneOffset() / 60) * 3600 * 1000);

    if (isNaN(mtime.getTime())) {
        console.log("Could not generate a valid date from parameters");
        return;
    }

    fs.utimesSync(file, previous_stats.atime, mtime);

    console.log(`File date time ${new_date === old_date && new_time === old_time ? "reverted" : "changed"} to ${new_date} ${new_time}`);

    console.log("Press Enter");
    await stdin();
    return process.exit(0);
})().then(null, null);
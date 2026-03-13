const fs = require("fs");
function timeToSeconds(timeStr) {

    let [time, modifier] = timeStr.split(" ")
    let [hours, minutes, seconds] = time.split(":").map(Number)

    if (modifier === "pm" && hours !== 12) {
        hours += 12
    }

    if (modifier === "am" && hours === 12) {
        hours = 0
    }

    return hours * 3600 + minutes * 60 + seconds
}

function durationToSeconds(time) {

    let [h, m, s] = time.split(":").map(Number)

    return h * 3600 + m * 60 + s
}

function secondsToTime(sec) {

    let h = Math.floor(sec / 3600)
    let m = Math.floor((sec % 3600) / 60)
    let s = sec % 60

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    let start = timeToSeconds(startTime)
    let end = timeToSeconds(endTime)

    let diff = end - start

    return secondsToTime(diff)
}
// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    let start = timeToSeconds(startTime)
    let end = timeToSeconds(endTime)

    let startDelivery = timeToSeconds("8:00:00 am")
    let endDelivery = timeToSeconds("10:00:00 pm")

    let idle = 0

    if(start < startDelivery){
        idle += startDelivery - start
    }

    if(end > endDelivery){
        idle += end - endDelivery
    }

    return secondsToTime(idle)
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    let shift = durationToSeconds(shiftDuration)
    let idle = durationToSeconds(idleTime)

    let active = shift - idle

    return secondsToTime(active)
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let day = parseInt(date.split("-")[2])

    let active = durationToSeconds(activeTime)

    let quota

    if(day >= 10 && day <= 30){
        quota = 6 * 3600
    } else {
        quota = 8 * 3600 + 24 * 60
    }

    return active >= quota
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj){

    let data = fs.readFileSync(textFile,"utf8")
    let lines = data.trim().split("\n")

    for(let line of lines){

        let parts = line.split(",")

        let id = parts[0]
        let date = parts[2]

        if(id === shiftObj.driverID && date === shiftObj.date){
            return {}
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime)
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime)
    let activeTime = getActiveTime(shiftDuration, idleTime)
    let bonus = metQuota(shiftObj.date, activeTime)

    let record = `${shiftObj.driverID},${shiftObj.driverName},${shiftObj.date},${shiftObj.startTime},${shiftObj.endTime},${shiftDuration},${idleTime},${activeTime},${bonus}`

    fs.appendFileSync(textFile,"\n"+record)

    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        bonus: bonus
    }
}
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue){

    let data = fs.readFileSync(textFile, "utf8")
    let lines = data.trim().split("\n")

    for(let i = 0; i < lines.length; i++){

        let parts = lines[i].split(",")

        let id = parts[0]
        let shiftDate = parts[2]

        if(id === driverID && shiftDate === date){

            parts[8] = newValue

            lines[i] = parts.join(",")

        }
    }

    fs.writeFileSync(textFile, lines.join("\n"))

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month){

    let data = fs.readFileSync(textFile, "utf8")
    let lines = data.trim().split("\n")

    let count = 0
    let found = false

    for(let line of lines){

        let parts = line.split(",")

        let id = parts[0]

        if(id === driverID){

            found = true

            let m = parseInt(parts[2].split("-")[1])

            if(m == parseInt(month) && parts[8] === "true"){
                count++
            }
        }

    }

    if(!found) return -1

    return count
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month){

    let data = fs.readFileSync(textFile, "utf8")
    let lines = data.trim().split("\n")

    let totalSeconds = 0

    for(let line of lines){

        let parts = line.split(",")

        let id = parts[0]

        if(id === driverID){

            let m = parseInt(parts[2].split("-")[1])

            if(m == month){

                let activeTime = parts[7]

                totalSeconds += durationToSeconds(activeTime)

            }

        }

    }

    return secondsToTime(totalSeconds)

}
// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

    let data = fs.readFileSync(rateFile, "utf8")
    let lines = data.trim().split("\n")

    for(let line of lines){

        let parts = line.split(",")

        if(parts[0] === driverID){

            let requiredHours = parseInt(parts[3])

            requiredHours = requiredHours - bonusCount

            let seconds = requiredHours * 3600

            return secondsToTime(seconds)
        }
    }

    return "0:00:00"
}
// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile){

    let data = fs.readFileSync(rateFile, "utf8")
    let lines = data.trim().split("\n")

    let rate = 0

    for(let line of lines){

        let parts = line.split(",")

        if(parts[0] === driverID){
            rate = parseInt(parts[2])
        }

    }

    let actual = durationToSeconds(actualHours) / 3600
    let required = durationToSeconds(requiredHours) / 3600

    let pay = (actual - required) * rate

    return Math.floor(pay)

}
module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};

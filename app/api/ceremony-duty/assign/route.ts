
import { NextResponse } from 'next/server';

console.log("API route module loaded: /api/ceremony-duty/assign");

// Helper to convert Thai numerals to Arabic numerals
function toArabic(str: string) {
  return (str || '').replace(/[๐-๙]/g, (d: string) => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

const normalizeName = (firstName?: string, lastName?: string): string => {
    const first = (firstName || "").toString().trim()
    const last = (lastName || "").toString().trim()
    return `${first} ${last}`.trim()
}

interface PersonData {
  ลำดับ: string
  ยศ: string
  ชื่อ: string
  สกุล: string
  ชั้นปีที่: string
  ตอน: string
  ตำแหน่ง: string
  สังกัด: string
  เบอร์โทรศัพท์: string
  หน้าที่?: string
  ชมรม?: string
  สถิติโดนยอด: string
}

export async function POST(request: Request) {
    console.log("POST /api/ceremony-duty/assign received a request at", new Date().toISOString());
    try {
        const body = await request.json();
        let {
            allPersons,
            requiredByYear,
            namesToExclude: namesToExcludeArray,
            statMax,
            statDomain,
            excludedPositions,
            excludedClubs,
        } = body;

        const namesToExclude = new Set(namesToExcludeArray);

        console.log("--- Initiating Duty Assignment (Server-side) ---");

        if (!allPersons || allPersons.length === 0) {
            throw new Error("No persons data provided.");
        }
        
        // Calculate total required persons from requiredByYear
        const totalRequiredPersons = Object.values(requiredByYear).reduce((sum: number, count: any) => sum + count, 0);
        console.log(`[1] Required counts:`, requiredByYear, `Total: ${totalRequiredPersons}`);
        
        console.log(`[2] Starting with ${allPersons.length} total persons.`);
        let filteredData = [...allPersons];

        // --- Filter based on Excel file ---
        if (namesToExclude.size > 0) {
            const beforeCount = filteredData.length;
            filteredData = filteredData.filter(person => {
            const personName = normalizeName(person.ชื่อ, person.สกุล)
            return !namesToExclude.has(personName)
            })
            console.log(`[3] After Excel exclusion: ${beforeCount} -> ${filteredData.length} persons.`);
        } else {
            console.log(`[3] No Excel exclusion file used.`);
        }
        
        // --- filter by statRange ---
        const beforeStatCount = filteredData.length;
        filteredData = filteredData.filter(person => {
            const stat = parseInt(person.สถิติโดนยอด, 10) || 0;
            return stat >= statDomain[0] && stat <= statMax;
        });
        console.log(`[4] After stat filter (max <= ${statMax}): ${beforeStatCount} -> ${filteredData.length} persons.`);

        const normalize = (str?: string) => (str ? str.trim().toLowerCase() : "")

        if (excludedPositions.length > 0) {
            const beforePositionCount = filteredData.length;
            const normPositions = excludedPositions.map(normalize)
            filteredData = filteredData.filter(person => !normPositions.includes(normalize(person.หน้าที่)))
            console.log(`[5] After position exclusion: ${beforePositionCount} -> ${filteredData.length} persons.`);
        } else {
            console.log(`[5] No positions excluded.`);
        }

        if (excludedClubs.length > 0) {
            const beforeClubCount = filteredData.length;
            const normClubs = excludedClubs.map(normalize)
            filteredData = filteredData.filter(person => !normClubs.includes(normalize(person.ชมรม)))
            console.log(`[6] After club exclusion: ${beforeClubCount} -> ${filteredData.length} persons.`);
        } else {
            console.log(`[6] No clubs excluded.`);
        }
        
        console.log(`[7] Final filtered data count: ${filteredData.length} persons.`);
        console.log("[7.1] Filtered Data Sample:", filteredData.slice(0, 5));


        if (filteredData.length < totalRequiredPersons) {
            console.error(`Insufficient personnel: Required ${totalRequiredPersons}, but only ${filteredData.length} available after filtering.`);
            return NextResponse.json({ 
                success: false, 
                error: "บุคลากรไม่เพียงพอ",
                description: `ต้องการ ${totalRequiredPersons} คน แต่มีเพียง ${filteredData.length} คนหลังจากการกรอง`
            }, { status: 400 });
        }
        
        if (filteredData.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: "ไม่มีข้อมูลที่ตรงตามเงื่อนไข",
                description: "กรุณาปรับเงื่อนไขการกรอง"
            }, { status: 400 });
        }

        // Shuffle filteredData (Fisher-Yates)
        for (let i = filteredData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredData[i], filteredData[j]] = [filteredData[j], filteredData[i]]
        }

        // Sort by stats (ascending - least duty assignments first)
        filteredData.sort((a, b) => parseInt(a.สถิติโดนยอด, 10) - parseInt(b.สถิติโดนยอด, 10))
        console.log("[8] Sorted filtered data by stats (asc). Sample:", filteredData.slice(0, 5).map(p => ({name: p.ชื่อ, stat: p.สถิติโดนยอด})));

        const selected: PersonData[] = []
        const usedIndices = new Set<string>()

        console.log("[9] Starting year-specific selection...");
        // Iterate through years from 5 down to 1
        for (let year = 5; year >= 1; year--) {
            const yearStr = String(year);
            let countForYear = requiredByYear[yearStr];

            if (countForYear === undefined || countForYear <= 0) continue;
            
            console.log(`[9.${6-year}] Selecting for Year ${year}: need ${countForYear}`);

            const availableForYear = filteredData.filter(p => {
                const yearVal = parseInt(toArabic(p.ชั้นปีที่), 10);
                return yearVal === year && !usedIndices.has(p.ลำดับ);
            });
            console.log(` -> Found ${availableForYear.length} available persons for Year ${year}.`);

            availableForYear.sort((a, b) => parseInt(a.สถิติโดนยอด, 10) - parseInt(b.สถิติโดนยอด, 10));

            const newlySelectedForYear = [];
            for (let i = 0; i < Math.min(countForYear, availableForYear.length); i++) {
                const person = availableForYear[i];
                selected.push(person);
                usedIndices.add(person.ลำดับ);
                newlySelectedForYear.push({name: person.ชื่อ, stat: person.สถิติโดนยอด});
            }
            if(newlySelectedForYear.length > 0) {
                console.log(` -> Selected ${newlySelectedForYear.length} persons for Year ${year}:`, newlySelectedForYear);
            }
        }

        console.log(`[10] After year-specific selection, have ${selected.length} / ${totalRequiredPersons} persons.`);

        if (selected.length < totalRequiredPersons) {
            console.log(`[11] Filling remaining ${totalRequiredPersons - selected.length} slots...`);
            let remainingFilteredData = filteredData.filter(p => !usedIndices.has(p.ลำดับ));
            remainingFilteredData.sort((a, b) => parseInt(a.สถิติโดนยอด, 10) - parseInt(b.สถิติโดนยอด, 10));
            console.log(` -> Have ${remainingFilteredData.length} persons left in the pool.`);

            const newlySelectedForFill = [];
            while (selected.length < totalRequiredPersons && remainingFilteredData.length > 0) {
                const person = remainingFilteredData.shift();
                if (person) {
                    selected.push(person);
                    usedIndices.add(person.ลำดับ);
                    newlySelectedForFill.push({name: person.ชื่อ, stat: person.สถิติโดนยอด});
                }
            }
            if(newlySelectedForFill.length > 0) {
                console.log(` -> Filled with ${newlySelectedForFill.length} additional persons:`, newlySelectedForFill);
            }
        }

        console.log(`[12] Final selection count: ${selected.length} persons.`);
        console.log("[12.1] Final selected persons:", selected.map(p => ({name: p.ชื่อ, year: p.ชั้นปีที่, stat: p.สถิติโดนยอด})));

        if (selected.length !== totalRequiredPersons) {
            console.warn(`Final count mismatch: Required ${totalRequiredPersons}, but got ${selected.length}.`);
            // We are returning the data anyway, but the client will show a toast.
        }

        // Sort for final display
        selected.sort((a, b) => {
            const yearA = parseInt(toArabic(a.ชั้นปีที่), 10) || 0;
            const yearB = parseInt(toArabic(b.ชั้นปีที่), 10) || 0;
            if (yearA !== yearB) return yearB - yearA; // 5 > 4 > ... > 1
            if (a.สังกัด !== b.สังกัด) return a.สังกัด.localeCompare(b.สังกัด, "th");
            return a.ตำแหน่ง.localeCompare(b.ตำแหน่ง, "th");
        });

        return NextResponse.json({ 
            success: true, 
            selectedPersons: selected,
            message: selected.length !== totalRequiredPersons 
                ? `ต้องการ ${totalRequiredPersons} คน แต่จัดได้เพียง ${selected.length} คน`
                : `เลือกบุคลากร ${selected.length} คนสำเร็จ`
        });

    } catch (error: any) {
        console.error('[API/ASSIGN] ERROR:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to assign duty' }, { status: 500 });
    }
}

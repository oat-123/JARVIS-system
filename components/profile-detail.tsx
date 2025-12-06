"use client"
import { getFriendlySheetName } from "@/components/modules/ceremony-duty"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Phone, Award, Calendar, MapPin, Star, RefreshCw, Download } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"


interface ProfileDetailProps {
  person: any
  onBack: () => void
}

// Helper function to format Thai short date
const toThaiShortDate = (input: string) => {
  if (!input) return ''
  try {
    const d = new Date(input)
    if (isNaN(d.getTime())) return input
    const day = d.getDate()
    const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const year = d.getFullYear() + 543
    const shortYear = String(year).slice(-2)
    const thaiNum = (n:number) => String(n).split('').map(ch => '๐๑๒๓๔๕๖๗๘๙'[parseInt(ch)]).join('')
    return `${thaiNum(day)} ${monthNames[d.getMonth()]} ${thaiNum(parseInt(shortYear))}`
  } catch (e) { return input }
}

export function ProfileDetail({ person, onBack }: ProfileDetailProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const [isDownloadingWord, setIsDownloadingWord] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [showFileNotFoundDialog, setShowFileNotFoundDialog] = useState<boolean>(false);
  const [fileTypeNotFound, setFileTypeNotFound] = useState<'word' | 'pdf' | null>(null);
  
  const [showSecondaryDownloadDialog, setShowSecondaryDownloadDialog] = useState<boolean>(false);
  const { toast } = useToast();

  if (!person) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">ไม่พบข้อมูล</h2>
          <Button onClick={onBack} className="bg-blue-600">← ย้อนกลับ</Button>
        </div>
      </div>
    )
  }

  const fullName = `${(person.ยศ || '').trim()} ${(person.ชื่อ || '').trim()} ${(person.สกุล || '').trim()}`.replace(/\s+/g, ' ').trim()
  const dotIndex = fullName.indexOf('.');
  let wordFilename = fullName;
  if (dotIndex > -1) {
      const rank = fullName.substring(0, dotIndex + 1);
      const name = fullName.substring(dotIndex + 1).trim();
      wordFilename = rank + name;
  }
  const displayName = (person.ชื่อ && person.ชื่อ !== "นนร.") ? fullName : "ไม่พบชื่อจริง"
  const position = person['ตำแหน่ง ทกท.'] || person.ตำแหน่ง || person['ทกท.'] || ''

  useEffect(() => {
    console.log('Profile Detail - reportHistory:', person.reportHistory);
    console.log('Profile Detail - reportInfo:', person.reportInfo);
  }, [person]);

  const fetchAvatar = useCallback(async () => {
    if (person?.ชื่อ && person?.สกุล) {
      setIsLoadingImage(true); // Set loading to true
      const cacheKey = `avatar_${person.ชื่อ}_${person.สกุล}`;
      const cachedUrl = localStorage.getItem(cacheKey);

      if (cachedUrl) {
        setAvatarUrl(cachedUrl);
        setIsLoadingImage(false); // Set loading to false if cached
        return;
      }

      try {
        const res = await fetch('/api/image-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first: person.ชื่อ, last: person.สกุล }),
        });
        const data = await res.json();

        if (data.success) {
          // Set the thumbnail first for a quick preview
          if (data.thumbnailLink) {
            setAvatarUrl(data.thumbnailLink);
          }

          // Then load the full image in the background
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(data.link)}`;
          const img = new Image();
          img.src = proxyUrl;
          img.onload = () => {
            setAvatarUrl(proxyUrl);
            localStorage.setItem(cacheKey, proxyUrl);
            setIsLoadingImage(false); // Set loading to false after full image loads
          };
          img.onerror = () => { // Handle error case
            setIsLoadingImage(false);
            console.error('Failed to load full image from proxy.');
          };
        } else {
          setIsLoadingImage(false); // Set loading to false if API call fails
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
        setIsLoadingImage(false); // Set loading to false on error
      }
    }
  }, [person, setAvatarUrl, setIsLoadingImage]);

  useEffect(() => {
    if (person?.ชื่อ && person?.สกุล) {
      fetchAvatar();
    }
  }, [person, fetchAvatar]);

  const handleDownload = () => {
    if (avatarUrl) {
      const link = document.createElement('a');
      link.href = avatarUrl;
      link.download = `${fullName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRefresh = () => {
    if (person?.ชื่อ) {
      const cacheKey = `avatar_${person.ชื่อ}_${person.สกุล}`;
      localStorage.removeItem(cacheKey);
      setAvatarUrl(null);
      fetchAvatar();
    }
  };

  const handleWordDownload = () => handleFileDownload('word');
  const handlePdfDownload = () => handleFileDownload('pdf');

  const handleFileDownload = async (fileType: 'word' | 'pdf') => {
    const isWord = fileType === 'word';
    const setLoading = isWord ? setIsDownloadingWord : setIsDownloadingPdf;
    const fileExtension = isWord ? 'docx' : 'pdf';

    if (!person?.ชื่อ) return;

    setLoading(true);
    toast({
      title: `กำลังค้นหาไฟล์ ${fileType.toUpperCase()}...`,
      description: `วิธีที่ 1: ค้นหาในโฟลเดอร์รวม...`,
    });

    try {
      // First attempt: Use the simple fetch from the main folder
      const res = await fetch('/api/fetch-file-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personName: wordFilename, fileType }),
      });

      const data = await res.json();

      // NEW LOGIC: Check score if file is found
      if (data.success && data.link && data.score >= 95) {
        toast({
          title: "พบไฟล์แล้ว!",
          description: `ความแม่นยำ ${data.score}%, กำลังเริ่มดาวน์โหลด...`,
          variant: "default",
        });
        const link = document.createElement('a');
        link.href = data.link;
        link.download = data.fileName || `${wordFilename}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setLoading(false);
      } else {
        // If not found, score is too low, or link is missing, use fallback
        const reason = data.success ? `ความแม่นยำต่ำ (${data.score}%)` : "ไม่พบไฟล์";
        toast({
          title: `${reason}, กำลังลองวิธีสำรอง...`,
          variant: "default",
        });

        if (fileType === 'word') {
          // Directly trigger secondary download for Word
          // The secondary function will handle setLoading(false)
          handleSecondaryWordDownload();
        } else {
          // Show "not found" dialog for PDF
          setFileTypeNotFound('pdf');
          setShowFileNotFoundDialog(true);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error(`Error downloading ${fileType} file:`, error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลดไฟล์ได้ในขณะนี้",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSecondaryWordDownload = async () => {
    if (!person?.ชื่อ) return;

    setIsDownloadingWord(true);
    toast({
      title: "กำลังค้นหาไฟล์ Word...",
      description: "วิธีที่ 2: ค้นหาในโฟลเดอร์ตามชื่อ...",
    });

    // Logic from create-files.tsx
    const personFolderName = `นนร. ${fullName}`.replace(/นนร\.\s*นนร\./i, 'นนร.');

    try {
      const res = await fetch('/api/drive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: personFolderName,
          folderName: personFolderName,
        }),
      });

      const data = await res.json();
      if (data.success && data.link) {
        toast({
          title: "พบไฟล์แล้ว!",
          description: "กำลังเริ่มดาวน์โหลดจากโฟลเดอร์บุคคล...",
          variant: "default",
        });
        const link = document.createElement('a');
        link.href = data.link;
        link.download = data.fileName || `${wordFilename}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "ไม่พบไฟล์",
          description: "ไม่พบไฟล์ Word ในโฟลเดอร์ตามชื่อบุคคล",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during secondary Word file download:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลดไฟล์ได้ในขณะนี้",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingWord(false);
    }
  };

  // เรียก API เพื่อ log ข้อมูลใน terminal ทุกครั้งที่เปิดโปรไฟล์
  useEffect(() => {
    try {
      const payload = {
        name: fullName,
        position,
        // prefer structured reportInfo (mapping) and parsed reportHistory
        report: {
          raw: person.ถวายรายงาน || null,
          partner: person['น.กำกับยาม'] || null,
          date: person.วันที่ || null,
          reportInfo: person.reportInfo || {},
          reportHistory: person.reportHistory || [],
        },
        enter433Dates: Array.isArray(person._433_dates) ? person._433_dates : [],
        adminChpDates: Array.isArray(person._admin_dates) ? person._admin_dates : [],
        // เพิ่มข้อมูลใหม่ทั้งหมด
        allPersonData: person,
        detected433Columns: person._433_columns || [],
        detectedAdminColumns: person._admin_columns || [],
        metadata: {
          total433Columns: person._433_columns?.length || 0,
          totalAdminColumns: person._admin_columns?.length || 0,
        }
      }
      
      // แสดง log ใน console ของ browser
      console.log('🔍 Profile Detail - ข้อมูลที่ได้รับ:', {
        timestamp: new Date().toISOString(),
        personName: fullName,
        allData: person,
        summary: {
          basicInfo: {
            ลำดับ: person.ลำดับ,
            ยศ: person.ยศ,
            ชื่อ: person.ชื่อ,
            สกุล: person.สกุล,
            ชั้นปีที่: person.ชั้นปีที่,
            ตอน: person.ตอน,
            ตำแหน่ง: person.ตำแหน่ง,
            สังกัด: person.สังกัด,
            เบอร์โทรศัพท์: person.เบอร์โทรศัพท์,
            คัดเกรด: person.คัดเกรด,
          },
          additionalInfo: {
            'ธุรการ ฝอ.': person['ธุรการ ฝอ.ลา'],
            ตัวชน: person.ตัวชน,
            ส่วนสูง: person.ส่วนสูง,
            นักกีฬา: person.นักกีฬา,
            'ภารกิจอื่น ๆ': person['ภารกิจอื่น ๆลา'],
            'ดูงานต่างประเทศ': person['ดูงานต่างประเทศลา'],
            'เจ็บ (ใบรับรองแพทย์)': person['เจ็บ (ใบรับรองแพทย์)ลา'],
            หมายเหตุ: person.หมายเหตุ,
          },
          reportInfo: {
            ถวายรายงาน: person.ถวายรายงาน,
            'น.กำกับยาม': person['น.กำกับยามลา'],
            วันที่: person.วันที่,
          },
          dynamicColumns: {
            '433_columns': person._433_columns || [],
            'admin_columns': person._admin_columns || [],
            '433_dates': person._433_dates || [],
            'admin_dates': person._admin_dates || [],
          }
        }
      })
      
      fetch('/api/profile-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}) // Suppress errors for logging
    } catch (e) {
      console.error('❌ Error logging profile data:', e)
    }
  // เปลี่ยนเมื่อเป้าหมายเปลี่ยนคน
  }, [fullName, position, person._433_dates, person._admin_dates, person.ถวายรายงาน, person['น.กำกับยาม'], person.วันที่, person._433_columns, person._admin_columns])

  useEffect(() => {
    console.log('Profile Detail - reportHistory:', person.reportHistory);
    console.log('Profile Detail - reportInfo:', person.reportInfo);
    console.log('=== ข้อมูลจาก Google Sheets ===')
    console.log('ข้อมูลทั้งหมด:', person)
    console.log('433 ครั้งที่ 1:', person['433 ครั้งที่ 1'])
    console.log('433 ครั้งที่ 2:', person['433 ครั้งที่ 2'])
    console.log('433 ครั้งที่ 3:', person['433 ครั้งที่ 3'])
    console.log('433 ครั้งที่ 4:', person['433 ครั้งที่ 4'])
    console.log('ถวายรายงาน:', person.ถวายรายงาน)
    console.log('น.กำกับยาม:', person['น.กำกับยาม'])
    console.log('วันที่:', person.วันที่)
    console.log('ธุรการ ครั้งที่ 1:', person['ธุรการ ครั้งที่ 1'])
    console.log('ธุรการ ครั้งที่ 2:', person['ธุรการ ครั้งที่ 2'])
    console.log('ธุรการ ครั้งที่ 3:', person['ธุรการ ครั้งที่ 3'])
    console.log('ธุรการ ครั้งที่ 4:', person['ธุรการ ครั้งที่ 4'])
    console.log('ธุรการ ครั้งที่ 5:', person['ธุรการ ครั้งที่ 5'])
    console.log('enter433 array:', person.enter433)
    console.log('reportHistory array:', person.reportHistory)
    console.log('enterChp array:', person.enterChp)
    console.log('===============================')
  }, [person])

  // Calculate 433 count from the processed enter433 array
  const calculate433Count = () => {
    return Array.isArray(person.enter433) ? person.enter433.length : 0;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-start items-center mb-4 gap-2">
          <Button 
            onClick={onBack} 
            className="bg-yellow-400 text-black px-3 py-2 rounded-md shadow hover:bg-yellow-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ย้อนกลับ
          </Button>
          <Button 
            onClick={handleRefresh} 
            className="bg-green-500 text-white p-2 rounded-full shadow hover:bg-green-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-3xl font-extrabold text-center tracking-tight mb-6">รายละเอียด</h2>

        {/* Profile Card */}
        <div className="rounded-lg p-6 shadow-md border border-slate-700/20 bg-gradient-to-tr from-blue-800/20 via-slate-800/10 to-transparent">
          {/* User Info Section: Role and Group from DB */}
          {/* Profile Picture and Name */}
          <div className="flex flex-col items-center mb-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-700/40 flex items-center justify-center overflow-hidden ring-4 ring-white/6 shadow-2xl cursor-pointer">
              {isLoadingImage ? (
                <div className="text-slate-200 text-center">
                  <span className="text-sm">กำลังโหลด...</span>
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-200 text-center">
                  <User className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">รูปภาพ</span>
                </div>
              )}
            </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ดาวน์โหลดรูปภาพ</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณต้องการดาวน์โหลดรูปภาพนี้หรือไม่?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDownload}>ดาวน์โหลด</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="text-center mt-4">
              <div className="text-2xl font-semibold text-white">{displayName}</div>
              <div className="text-sm text-slate-300 mt-1">{position}</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="divide-y divide-slate-500/40 bg-transparent rounded-md overflow-hidden">
            {/* Basic Information - 4 column layout */}
            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                ลำดับ
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.ลำดับ || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                ชั้นปีที่
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.ชั้นปีที่ || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                ตอน
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.ตอน || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                สังกัด
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.สังกัด || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                เบอร์โทรศัพท์
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.เบอร์โทรศัพท์ || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                คัดเกรด
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.คัดเกรด || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                ธุรการ ฝอ.
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person['ธุรการ ฝอ.'] || person.ธุรการ || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                ตัวชน
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.ตัวชน || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                ส่วนสูง
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.ส่วนสูง || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                นักกีฬา
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.นักกีฬา || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                ภารกิจอื่น ๆ
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person['ภารกิจอื่น ๆ'] || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                ดูงานต่างประเทศ
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person['ดูงานต่างประเทศ'] || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                เจ็บ (ใบรับรองแพทย์)
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person['เจ็บ (ใบรับรองแพทย์)'] || '-'}</div >
            </div>

            <div className="grid grid-cols-4 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                หมายเหตุ
              </div>
              <div></div>
              <div></div>
              <div className="text-base font-medium text-white text-right">{person.หมายเหตุ || '-'}</div >
            </div>


            {/* Report History */}
            {(person.reportHistory && person.reportHistory.length > 0) || (person.reportInfo && Object.keys(person.reportInfo || {}).length > 0) ? (
              <div>
                {/* Prefer parsed reportHistory grouped by columnHeader */}
                {Array.isArray(person.reportHistory) && person.reportHistory.length > 0 ? (
                  person.reportHistory.map((entry: any, index: number) => (
                    <div key={index} className="grid grid-cols-4 items-start px-6 py-4">
                      {index === 0 && <div className="text-sm text-slate-300">ประวัติถวายรายงาน</div>}
                      {index !== 0 && <div></div>}
                      <div></div>
                      <div className="text-sm text-slate-400 font-semibold text-right pr-4">{entry.columnHeader ? `${entry.columnHeader} :` : ''}</div>
                      <div className="text-base font-medium text-white">
                        <div className="flex gap-1 flex-wrap mb-1">
                          {entry.code && entry.code !== 'คู่' && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              entry.code === 'HMSV' ? 'bg-purple-300 text-black' :
                              entry.code === '๙๐๔' ? 'bg-yellow-400 text-black' :
                              entry.code === '๙๑๙' ? 'bg-blue-400 text-black' :
                              'bg-blue-600 text-white'
                            }`}>{entry.code}</span>
                          )}
                          {entry.position && entry.position !== 'คู่' && <span className="bg-purple-600 px-2 py-0.5 rounded text-xs">{entry.position}</span>}
                          {(entry.code === 'คู่' || entry.position === 'คู่') && <span className="text-white">{entry.code === 'คู่' ? entry.code : entry.position}</span>}
                        </div>
                        {entry.fullName && <div className="text-white">{entry.fullName}</div>}
                        {entry.date && <div className="text-slate-400 text-xs mt-1">{toThaiShortDate(entry.date)}</div>}
                        {entry._raw && !entry.fullName && <div className="text-slate-300 italic text-xs mt-1">{entry._raw}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  // If no parsed entries, show raw mapping from reportInfo (skip empty values)
                  (Object.entries(person.reportInfo || {})
                    .filter(([_, val]: [string, any]) => val && String(val).trim())
                    .map(([hdr, val]: [string, any], idx: number) => (
                      <div key={idx} className="grid grid-cols-4 items-start px-6 py-4">
                        {idx === 0 && <div className="text-sm text-slate-300">ประวัติถวายรายงาน</div>}
                        {idx !== 0 && <div></div>}
                        <div></div>
                        <div className="text-sm text-slate-400 font-semibold text-right pr-4">{hdr ? `${hdr} :` : ''}</div>
                        <div className="text-base font-medium text-white">{val || '-'}</div>
                      </div>
                    ))
                  )
                )}
              </div>
            ) : null}

            {/* 433 History */}
            {person.enter433 && person.enter433.length > 0 && (
              <div className="grid grid-cols-4 items-start px-6 py-4">
                <div className="text-sm text-slate-300">ประวัติเข้าเวร 433</div>
                <div></div>
                <div></div>
                <div className="text-base font-medium text-white">
                  {person.enter433.map((entry: any, index: number) => (
                    <div key={index} className="mb-1">
                      {toThaiShortDate(entry.date)}
                      {entry.note && <span className="text-slate-400 text-xs ml-2">({entry.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin/CHP History */}
            {person.enterChp && person.enterChp.length > 0 && (
              <div className="grid grid-cols-4 items-start px-6 py-4">
                <div className="text-sm text-slate-300">ประวัติเข้าเวรธุรการ</div>
                <div></div>
                <div></div>
                <div className="text-base font-medium text-white text-right">
                  {person.enterChp.map((entry: any, index: number) => (
                    <div key={index} className="mb-1">
                      {toThaiShortDate(entry.date)}
                      {entry.note && <span className="text-slate-400 text-xs ml-2">({entry.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic 433 Columns */}
            {person._433_columns && person._433_columns.length > 0 && (
              <div className="grid grid-cols-4 items-start px-6 py-4">
                <div className="text-sm text-slate-300">รายละเอียด 433</div>
                <div></div>
                <div></div>
                <div className="text-base font-medium text-white text-right">
                  {person._433_columns.map((col: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-slate-400 text-xs">{col.column}:</span> {col.value || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Admin Columns */}
            {person._admin_columns && person._admin_columns.length > 0 && (
              <div className="grid grid-cols-4 items-start px-6 py-4">
                <div className="text-sm text-slate-300">รายละเอียด ธุรการ</div>
                <div></div>
                <div></div>
                <div className="text-base font-medium text-white text-right">
                  {person._admin_columns.map((col: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-slate-400 text-xs">{col.column}:</span> {col.value || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-4 items-center px-6 py-6">
              <div className="text-sm text-slate-300">จำนวนครั้งที่เข้า433</div>
              <div></div>
              <div></div>
              <div className="text-lg font-semibold text-white text-right">
                <Badge variant="secondary" className="bg-orange-600 text-white">
                  {calculate433Count()}
                </Badge>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="px-6 py-6 flex flex-row gap-4 justify-center">
              <Button 
                onClick={handleWordDownload}
                disabled={isDownloadingWord}
                className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 disabled:bg-slate-500 w-full sm:w-1/2"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadingWord ? 'กำลังค้นหา...' : 'ดาวน์โหลดไฟล์ Word'}
              </Button>
              <Button 
                onClick={handlePdfDownload}
                disabled={isDownloadingPdf}
                className="bg-red-600 text-white px-4 py-2 rounded-md shadow hover:bg-red-700 disabled:bg-slate-500 w-full sm:w-1/2"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadingPdf ? 'กำลังค้นหา...' : 'ดาวน์โหลดไฟล์ PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Not Found Dialog */}
      <AlertDialog open={showFileNotFoundDialog} onOpenChange={setShowFileNotFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ไม่พบไฟล์ PDF</AlertDialogTitle>
            <AlertDialogDescription>
              ไม่พบไฟล์ PDF สำหรับ {wordFilename} ในโฟลเดอร์รวม
              คุณต้องการตรวจสอบโฟลเดอร์ Google Drive ด้วยตนเองหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFileNotFoundDialog(false)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              window.open('https://drive.google.com/drive/folders/1DsLfQC3x4G2swC8L92IuipH1XqCsKwtb', '_blank');
              setShowFileNotFoundDialog(false);
            }}>ตรวจสอบ Google Drive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Word Not Found / Secondary Download Dialog */}
      <AlertDialog open={showSecondaryDownloadDialog} onOpenChange={setShowSecondaryDownloadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ไม่พบไฟล์ Word ในโฟลเดอร์รวม</AlertDialogTitle>
            <AlertDialogDescription>
              ไม่พบไฟล์ Word สำหรับ {wordFilename} ในตำแหน่งแรก ต้องการค้นหาจากโฟลเดอร์ของบุคคลโดยตรงหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSecondaryDownloadDialog(false)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowSecondaryDownloadDialog(false);
              handleSecondaryWordDownload();
            }}>ค้นหาและดาวน์โหลด</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
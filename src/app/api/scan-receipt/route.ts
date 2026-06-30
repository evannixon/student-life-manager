import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

const VALID_CATEGORIES = ['makan', 'transport', 'kuliah', 'jajan', 'lainnya']

const SYSTEM_PROMPT = `Kamu adalah OCR khusus nota/struk belanja Indonesia. Analisis gambar nota yang diberikan dan ekstrak semua item belanja.

ATURAN PENTING:
1. Ekstrak SETIAP item dengan nama dan harga masing-masing sebagai entry TERPISAH
2. Field "name" HANYA berisi nama produk/item, JANGAN gabungkan dengan angka harga atau kode apapun
3. Field "price" HARUS berupa angka murni (number JSON, bukan string), tanpa titik, tanpa "Rp", tanpa koma. Contoh benar: 100000. Contoh SALAH: "100.000" atau "Rp 100,000"
4. Kategorikan tiap item ke salah satu dari: makan, transport, kuliah, jajan, lainnya
   - makan: makanan berat, nasi, lauk, restoran, warteg
   - transport: ojek online, bensin, parkir, tol
   - kuliah: alat tulis, fotokopi, buku, print
   - jajan: snack, minuman, kopi, jajanan ringan, voucher, pulsa
   - lainnya: yang tidak masuk kategori di atas
5. Jika tidak bisa membaca nota dengan jelas, kembalikan array kosong
6. Gabungkan item yang sama jika berulang (misal 2x Es Teh = 1 entry dengan harga total)
7. Abaikan informasi non-item seperti nama toko, tanggal, kasir, subtotal, pajak, kembalian — fokus HANYA pada baris item belanja
8. Maksimal 15 item per nota, ambil yang paling jelas terbaca

OUTPUT WAJIB berupa JSON array murni TANPA markdown code block, TANPA penjelasan, TANPA teks tambahan apapun. Format setiap item:
{"name": "nama item saja", "price": 100000, "category": "jajan"}

Contoh output lengkap:
[{"name":"Indomie Goreng","price":3500,"category":"jajan"},{"name":"Voucher Indomaret","price":100000,"category":"lainnya"}]

Jika nota tidak terbaca sama sekali, kembalikan persis: []`

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di .env.local' }, { status: 500 })
    }

    const { image, mimeType } = await req.json()
    if (!image) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 400 })
    }

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          response_mime_type: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error:', errText)
      return NextResponse.json({ error: 'Gagal memproses gambar dengan Gemini' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'

    // Strip markdown code blocks kalau ada
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    let items: { name: string; price: number | string; category: string }[] = []
    try {
      items = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Gemini response:', cleaned)
      return NextResponse.json({ error: 'Gagal membaca hasil scan. Coba foto ulang dengan pencahayaan lebih baik.' }, { status: 422 })
    }

    // Validasi & sanitasi tiap item
    const validItems = items
      .map(item => {
        if (!item || typeof item.name !== 'string') return null
        // Handle price yang mungkin masih string dengan format aneh
        let price: number
        if (typeof item.price === 'number') {
          price = item.price
        } else if (typeof item.price === 'string') {
          const numStr = (item.price as string).replace(/[^0-9]/g, '')
          price = parseInt(numStr, 10)
        } else {
          return null
        }
        if (!price || isNaN(price) || price <= 0) return null

        // Bersihkan nama dari angka harga yang mungkin ikut kebawa
        const cleanName = item.name.replace(/\b\d{1,3}([.,]\d{3})+\b/g, '').trim().slice(0, 100) || item.name.trim().slice(0, 100)

        return {
          name: cleanName,
          price: Math.round(price),
          category: VALID_CATEGORIES.includes(item.category) ? item.category : 'lainnya',
        }
      })
      .filter((item): item is { name: string; price: number; category: string } => item !== null)
      .slice(0, 15)

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Tidak ada item yang terdeteksi. Pastikan foto nota jelas dan tidak buram.' }, { status: 422 })
    }

    return NextResponse.json({ items: validItems })
  } catch (err) {
    console.error('OCR endpoint error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses nota' }, { status: 500 })
  }
}

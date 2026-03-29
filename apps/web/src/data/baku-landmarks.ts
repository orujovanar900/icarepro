// Baku metro stations and landmarks for filter chips

export interface MetroStation {
    id: string;
    name: string;
}

export interface Landmark {
    id: string;
    name: string;
    category: string;
}

export interface DistrictGroup {
    district: string;
    areas: string[];
}

// ─── Metro Stations ───────────────────────────────────────────────────────────

export const METRO_STATIONS: MetroStation[] = [
    { id: 'icherisheher',      name: 'İçərişəhər' },
    { id: 'sahil',             name: 'Sahil' },
    { id: 'ganjlik',           name: 'Gənclik' },
    { id: 'nariman_narimanov', name: 'Nəriman Nərimanov' },
    { id: 'bakmil',            name: 'Bakmil' },
    { id: 'ulduz',             name: 'Ulduz' },
    { id: 'koroglu',           name: 'Koroğlu' },
    { id: 'qara_qarayev',      name: 'Qara Qarayev' },
    { id: 'neftchilar',        name: 'Neftçilər' },
    { id: 'khalglar_dostlugu', name: 'Xalqlar Dostluğu' },
    { id: 'ahmadli',           name: 'Əhmədli' },
    { id: 'hajibeyov',         name: 'Hacıbəyov' },
    { id: 'memar_ajami_1',     name: 'Memar Əcəmi-1' },
    { id: 'memar_ajami_2',     name: 'Memar Əcəmi-2' },
    { id: '8_noyabr',          name: '8 Noyabr' },
    { id: 'avtovagzal',        name: 'Avtovağzal' },
    { id: 'darnagul',          name: 'Dərnəgül' },
    { id: 'hasan_aliyev',      name: 'Həsən Əliyev' },
    { id: 'nizami',            name: 'Nizami' },
    { id: 'elmler_akademiyasi', name: 'Elmlər Akademiyası' },
    { id: 'inshaatchilar',     name: 'İnşaatçılar' },
    { id: '20_yanvar',         name: '20 Yanvar' },
    { id: 'memar_ajami',       name: 'Memar Əcəmi' },
    { id: 'azadliq_prospekti', name: 'Azadlıq prospekti' },
    { id: 'duzdag',            name: 'Düzdağ' },
];

// ─── Districts with sub-areas ─────────────────────────────────────────────────

export const DISTRICT_GROUPS: DistrictGroup[] = [
    {
        district: 'Nəsimi',
        areas: ['28 May', 'Süleymaniyyə', 'Montin', 'Pik-Zirə'],
    },
    {
        district: 'Nərimanov',
        areas: ['Gənclik', 'Nəriman Nərimanov', 'Nizami', 'Koroğlu', 'Ulduz', 'Bakmil'],
    },
    {
        district: 'Xətai',
        areas: ['Həzi Aslanov', 'Qala', 'Lökbatan', 'Əhməd Cavad'],
    },
    {
        district: 'Yasamal',
        areas: ['Memar Əcəmi', 'İnşaatçılar', '20 Yanvar', 'Azadlıq'],
    },
    {
        district: 'Binəqədi',
        areas: ['Binəqədi', 'Biləcəri', 'Balaxanı', 'Sabunçu', 'Maştağa'],
    },
    {
        district: 'Sabunçu',
        areas: ['Zabrat', 'Ramana', 'Nardaran', 'Sabunçu'],
    },
    {
        district: 'Suraxanı',
        areas: ['Suraxanı', 'Yeni Günəşli', 'Hövsan', 'Qaraçuxur'],
    },
    {
        district: 'Sabail',
        areas: ['İçərişəhər', 'Bayıl', 'Biləcəri meşəsi', 'Badamdar'],
    },
    {
        district: 'Nizami',
        areas: ['Əhmədli', '8 Noyabr'],
    },
    {
        district: 'Abşeron',
        areas: ['Xırdalan', 'Novxanı', 'Corat', 'Pirəkəşkül', 'Balaxanı'],
    },
    {
        district: 'Xəzər',
        areas: ['Buzovna', 'Nardaran', 'Bilgəh', 'Pirəkəşkül', 'Məhəmmədli'],
    },
    {
        district: 'Qaradağ',
        areas: ['Müşfiqabad', 'Sahil', 'Lökbatan', 'Əmircan'],
    },
];

// ─── Landmarks / Nişangahlar ──────────────────────────────────────────────────
// Categories: Meydanlar | Parklar | Ticarət mərkəzi | Bazar | Universitet/Məktəb |
//             Yeni kompleks | Dövlət/Mədəniyyət | Tarixi/İdman

export const LANDMARKS: Landmark[] = [

    // ── Meydanlar / İctimai ərazilər ──────────────────────────────────────────
    { id: 'azadliq_meydani',   name: 'Azadlıq meydanı',   category: '🏛 Meydanlar' },
    { id: 'azneft_meydani',    name: 'Azneft meydanı',     category: '🏛 Meydanlar' },
    { id: 'favvareler_meydani', name: 'Fəvvarələr meydanı', category: '🏛 Meydanlar' },
    { id: 'neapol_dairesi',    name: 'Neapol dairəsi',     category: '🏛 Meydanlar' },
    { id: 'ukrayna_dairesi',   name: 'Ukrayna dairəsi',    category: '🏛 Meydanlar' },
    { id: 'cavanshir_korpusu', name: 'Cavanşir körpüsü',   category: '🏛 Meydanlar' },

    // ── Parklar / Bağlar ──────────────────────────────────────────────────────
    { id: 'axundov_bagi',          name: 'Axundov bağı',              category: '🌳 Parklar' },
    { id: 'bayil_parki',           name: 'Bayıl parkı',               category: '🌳 Parklar' },
    { id: 'daghustu_parki',        name: 'Dağüstü parkı',             category: '🌳 Parklar' },
    { id: 'filarmoniya_bagi',      name: 'Filarmoniya bağı',          category: '🌳 Parklar' },
    { id: 'huseyn_cavid_parki',    name: 'Hüseyn Cavid parkı',        category: '🌳 Parklar' },
    { id: 'izmir_parki',           name: 'İzmir parkı',               category: '🌳 Parklar' },
    { id: 'koala_parki',           name: 'Koala parkı',               category: '🌳 Parklar' },
    { id: 'mea_sabir_parki',       name: 'M.Ə.Sabir parkı',           category: '🌳 Parklar' },
    { id: 'mhuseynzade_parki',     name: 'M.Hüseynzadə parkı',        category: '🌳 Parklar' },
    { id: 'merkezi_nebatat_bagi',  name: 'Mərkəzi Nəbatat bağı',      category: '🌳 Parklar' },
    { id: 'merkezi_park',          name: 'Mərkəzi Park',              category: '🌳 Parklar' },
    { id: 'nariman_narimanov_parki', name: 'Nəriman Nərimanov parkı', category: '🌳 Parklar' },
    { id: 'park_zorge',            name: 'Park Zorge',                category: '🌳 Parklar' },
    { id: 'prezident_parki',       name: 'Prezident parkı',           category: '🌳 Parklar' },
    { id: 'sahil_bagi',            name: 'Sahil bağı',                category: '🌳 Parklar' },
    { id: 'semedvurgun_parki',     name: 'Səməd Vurğun parkı',        category: '🌳 Parklar' },
    { id: 'sevil_qaziyeva_parki',  name: 'Sevil Qazıyeva parkı',      category: '🌳 Parklar' },
    { id: 'xaqani_bagi',           name: 'Xaqani bağı',               category: '🌳 Parklar' },
    { id: 'zabitler_parki',        name: 'Zabitlər parkı',            category: '🌳 Parklar' },
    { id: 'zerifealiyeva_parki',   name: 'Zərifə Əliyeva adına park', category: '🌳 Parklar' },
    { id: 'sehidler_xiyabani',     name: 'Şəhidlər xiyabanı',         category: '🌳 Parklar' },
    { id: 'selelale_parki',        name: 'Şəlalə parkı',              category: '🌳 Parklar' },
    { id: 'zoopark',               name: 'Zoopark',                   category: '🌳 Parklar' },

    // ── Ticarət Mərkəzləri ────────────────────────────────────────────────────
    { id: 'absheron_tm',           name: 'Abşeron Ticarət Mərkəzi',         category: '🛍 Ticarət Mərkəzləri' },
    { id: 'bine_tm',               name: 'Binə Ticarət Mərkəzi',            category: '🛍 Ticarət Mərkəzləri' },
    { id: 'elit_tm',               name: 'Elit Ticarət Mərkəzi',            category: '🛍 Ticarət Mərkəzləri' },
    { id: 'eurohome_bileceri_tm',  name: 'Eurohome Biləcəri Ticarət Mərkəzi', category: '🛍 Ticarət Mərkəzləri' },
    { id: 'lacin_tm',              name: 'Laçın Ticarət Mərkəzi',           category: '🛍 Ticarət Mərkəzləri' },
    { id: 'meyveli_tm',            name: 'Meyvəli Ticarət Mərkəzi',         category: '🛍 Ticarət Mərkəzləri' },
    { id: 'port_baku',             name: 'Port Baku',                       category: '🛍 Ticarət Mərkəzləri' },
    { id: 'riyad_tm',              name: 'Riyad Ticarət Mərkəzi',           category: '🛍 Ticarət Mərkəzləri' },
    { id: 'sederek_tm',            name: 'Sədərək Ticarət Mərkəzi',         category: '🛍 Ticarət Mərkəzləri' },
    { id: 'xaqani_tm',             name: 'Xaqani Ticarət Mərkəzi',          category: '🛍 Ticarət Mərkəzləri' },
    { id: 'merkezi_univermaq',     name: 'Mərkəzi Univermaq',               category: '🛍 Ticarət Mərkəzləri' },

    // ── Bazarlar ──────────────────────────────────────────────────────────────
    { id: 'kesle_bazari',          name: 'Keşlə bazarı',                category: '🏪 Bazarlar' },
    { id: 'montin_bazari',         name: 'Montin bazarı',                category: '🏪 Bazarlar' },
    { id: 'nesimi_bazari',         name: 'Nəsimi bazarı',                category: '🏪 Bazarlar' },
    { id: 'sederek_elit',          name: 'Sədərək "Elit"',              category: '🏪 Bazarlar' },
    { id: 'sederek_xalca',         name: 'Sədərək xalça bazarı',        category: '🏪 Bazarlar' },
    { id: 'sederek_sirniyyat',     name: 'Sədərək şirniyyat bazarı',    category: '🏪 Bazarlar' },
    { id: 'sederek_tekstil',       name: 'Sədərək tekstil bazarı',      category: '🏪 Bazarlar' },
    { id: 'sederek_tesserufat',    name: 'Sədərək təsərrüfat bazarı',   category: '🏪 Bazarlar' },
    { id: 'serq_bazari',           name: 'Şərq bazarı',                 category: '🏪 Bazarlar' },
    { id: 'yasamal_bazari',        name: 'Yasamal bazarı',              category: '🏪 Bazarlar' },
    { id: 'neftci_bazasi',         name: 'Neftçi bazası',               category: '🏪 Bazarlar' },

    // ── Universitetlər / Məktəblər ────────────────────────────────────────────
    { id: 'adu',                   name: 'Azərbaycan Dillər Universiteti',           category: '🎓 Universitetlər' },
    { id: 'adnsu',                 name: 'Azərbaycan Dövlət Neft və Sənaye Universiteti', category: '🎓 Universitetlər' },
    { id: 'az_turizm_inst',        name: 'Azərbaycan turizm institutu',              category: '🎓 Universitetlər' },
    { id: 'baku_asiya_univ',       name: 'Bakı Asiya Universiteti',                  category: '🎓 Universitetlər' },
    { id: 'bdu',                   name: 'Bakı Dövlət Universiteti',                 category: '🎓 Universitetlər' },
    { id: 'bma',                   name: 'Bakı Musiqi Akademiyası',                  category: '🎓 Universitetlər' },
    { id: 'bsu',                   name: 'Bakı Slavyan Universiteti',                category: '🎓 Universitetlər' },
    { id: 'dim',                   name: 'DİM',                                      category: '🎓 Universitetlər' },
    { id: 'dia',                   name: 'Dövlət İdarəçilik Akademiyası',            category: '🎓 Universitetlər' },
    { id: 'incesenet_univ',        name: 'İncəsənət və Mədəniyyət Un.',              category: '🎓 Universitetlər' },
    { id: 'iqtisad_univ',          name: 'İqtisad Universiteti',                     category: '🎓 Universitetlər' },
    { id: 'landau_mektebi',        name: 'Landau Məktəbi (Sea Breeze)',               category: '🎓 Universitetlər' },
    { id: 'memarliq_univ',         name: 'Memarlıq və İnşaat Universiteti',          category: '🎓 Universitetlər' },
    { id: 'milli_konservatoriya',  name: 'Milli Konservatoriya',                     category: '🎓 Universitetlər' },
    { id: 'pedagoji_univ',         name: 'Pedaqoji Universiteti',                    category: '🎓 Universitetlər' },
    { id: 'ressaliq_akademiyasi',  name: 'Rəssamlıq Akademiyası',                   category: '🎓 Universitetlər' },
    { id: 'texniki_univ',          name: 'Texniki Universiteti',                     category: '🎓 Universitetlər' },
    { id: 'tibb_univ',             name: 'Tibb Universiteti',                        category: '🎓 Universitetlər' },

    // ── Yeni Tikililər / Komplekslər ──────────────────────────────────────────
    { id: 'ag_seher',              name: 'Ağ şəhər',                    category: '🏘 Yeni Komplekslər' },
    { id: 'beshmerebe',            name: 'Beşmərtəbə',                  category: '🏘 Yeni Komplekslər' },
    { id: 'bine_atchiliq',         name: 'Binə atçılıq mərkəzi',        category: '🏘 Yeni Komplekslər' },
    { id: 'circus_sea_breeze',     name: 'Circus Sea Breeze',           category: '🏘 Yeni Komplekslər' },
    { id: 'crescent_bay',          name: 'Crescent Bay',                category: '🏘 Yeni Komplekslər' },
    { id: 'grand_hayat',           name: 'Grand Hayat Residence',       category: '🏘 Yeni Komplekslər' },
    { id: 'inqilab_residence',     name: 'İnqilab Residence',           category: '🏘 Yeni Komplekslər' },
    { id: 'javahir_residence',     name: 'Javahir Residence',           category: '🏘 Yeni Komplekslər' },
    { id: 'kristal_bayil',         name: 'Kristal Abşeron Bayıl',       category: '🏘 Yeni Komplekslər' },
    { id: 'kristal_ecemi',         name: 'Kristal Abşeron Əcəmi',       category: '🏘 Yeni Komplekslər' },
    { id: 'kristal_qara_qarayev',  name: 'Kristal Abşeron Qara Qarayev', category: '🏘 Yeni Komplekslər' },
    { id: 'qis_parki',             name: 'Qış parkı',                   category: '🏘 Yeni Komplekslər' },
    { id: 'qurtulus_93',           name: 'Qurtuluş 93 YK',              category: '🏘 Yeni Komplekslər' },
    { id: 'melissa_azadliq',       name: 'Melissa Azadlıq',             category: '🏘 Yeni Komplekslər' },
    { id: 'melissa_park',          name: 'Melissa Park',                category: '🏘 Yeni Komplekslər' },
    { id: 'merida_premium',        name: 'Merida Premium',              category: '🏘 Yeni Komplekslər' },
    { id: 'mida_hovsan',           name: 'MIDA Hövsan',                 category: '🏘 Yeni Komplekslər' },
    { id: 'mida_hovsan_2',         name: 'MIDA Hövsan 2',               category: '🏘 Yeni Komplekslər' },
    { id: 'mida_yasamal',          name: 'MIDA Yasamal',                category: '🏘 Yeni Komplekslər' },
    { id: 'royal_residence',       name: 'Royal Residence',             category: '🏘 Yeni Komplekslər' },
    { id: 'sea_breeze_event',      name: 'Sea Breeze Event Hall',       category: '🏘 Yeni Komplekslər' },
    { id: 'sovetski',              name: 'Sovetski',                    category: '🏘 Yeni Komplekslər' },

    // ── Dövlət / ASAN / Mədəniyyət ────────────────────────────────────────────
    { id: 'asan_1',                name: 'ASAN Xidmət №1',              category: '🏢 Dövlət / ASAN' },
    { id: 'asan_2',                name: 'ASAN Xidmət №2',              category: '🏢 Dövlət / ASAN' },
    { id: 'asan_3',                name: 'ASAN Xidmət №3',              category: '🏢 Dövlət / ASAN' },
    { id: 'asan_5',                name: 'ASAN Xidmət №5',              category: '🏢 Dövlət / ASAN' },
    { id: 'dovlet_statistika',     name: 'Dövlət Statistika Komitəsi',  category: '🏢 Dövlət / ASAN' },
    { id: 'tehsil_nazirliyi',      name: 'Təhsil Nazirliyi',            category: '🏢 Dövlət / ASAN' },
    { id: 'rusiya_sefirliyi',      name: 'Rusiya səfirliyi',            category: '🏢 Dövlət / ASAN' },
    { id: 'space_tv',              name: 'Space TV',                    category: '🏢 Dövlət / ASAN' },

    // ── Tarixi / Mədəni / İdman ───────────────────────────────────────────────
    { id: 'icherisheher_landmark', name: 'İçəri Şəhər',                 category: '🎭 Tarixi / Mədəni' },
    { id: 'az_kinoteatr',          name: 'Azərbaycan kinoteatrı',       category: '🎭 Tarixi / Mədəni' },
    { id: 'ayna_sultanova',        name: 'Ayna Sultanova heykəli',      category: '🎭 Tarixi / Mədəni' },
    { id: 'dostluq_kino',          name: 'Dostluq kinoteatrı',          category: '🎭 Tarixi / Mədəni' },
    { id: 'heyder_idman',          name: 'Heydər Əliyev adına İdman Kompleksi', category: '🎭 Tarixi / Mədəni' },
    { id: 'xalca_muzeyi',          name: 'Xalça Muzeyi',                category: '🎭 Tarixi / Mədəni' },
    { id: 'narimanov_heykeli',     name: 'Nərimanov heykəli',           category: '🎭 Tarixi / Mədəni' },
    { id: 'nizami_kino',           name: 'Nizami kinoteatrı',           category: '🎭 Tarixi / Mədəni' },
    { id: 'respublika_stadionu',   name: 'Respublika stadionu',         category: '🎭 Tarixi / Mədəni' },
    { id: 'sirk',                  name: 'Sirk',                        category: '🎭 Tarixi / Mədəni' },
    { id: 'sefa_stadionu',         name: 'Şəfa stadionu',               category: '🎭 Tarixi / Mədəni' },
];

export const LANDMARK_CATEGORIES = Array.from(new Set(LANDMARKS.map(l => l.category)));

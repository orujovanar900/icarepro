import { useState } from "react";

const BRAND = {
  colors: {
    primary: "#0D1117",
    secondary: "#161B22",
    card: "#1C2128",
    gold: "#F5C842",
    goldDark: "#D4A017",
    white: "#FFFFFF",
    gray: "#8B949E",
    lightGray: "#C9D1D9",
    danger: "#FF4444",
    success: "#00C853",
  },
  fonts: {
    heading: "Inter, sans-serif",
    body: "Inter, sans-serif",
  },
};

const sections = ["Overview", "Rənglər", "Tipografiya", "Logo & İkon", "Post Şablonları", "Grid Sistemi", "Caption Şablonları", "Platformalar", "Workflow"];

export default function BrandBook() {
  const [active, setActive] = useState("Overview");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#0D1117", minHeight: "100vh", color: "#C9D1D9" }}>
      {/* Header */}
      <div style={{ background: "#161B22", borderBottom: "1px solid #30363D", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 22, color: "#F5C842", fontStyle: "italic" }}>İcarə</span>
          <span style={{ fontWeight: 800, fontSize: 22, color: "#FFFFFF" }}>Pro</span>
          <span style={{ background: "#F5C842", color: "#0D1117", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4 }}>SMM BRAND BOOK</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#8B949E" }}>v1.0 · 2026</div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Sidebar Nav */}
        <div style={{ width: 200, background: "#161B22", borderRight: "1px solid #30363D", minHeight: "calc(100vh - 57px)", padding: "24px 0", position: "sticky", top: 57, alignSelf: "flex-start" }}>
          {sections.map(s => (
            <div key={s} onClick={() => setActive(s)} style={{
              padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: active === s ? 600 : 400,
              color: active === s ? "#F5C842" : "#8B949E",
              background: active === s ? "rgba(245,200,66,0.08)" : "transparent",
              borderLeft: active === s ? "3px solid #F5C842" : "3px solid transparent",
              transition: "all 0.15s"
            }}>{s}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "40px 48px", maxWidth: 900 }}>
          {active === "Overview" && <OverviewSection />}
          {active === "Rənglər" && <ColorsSection copy={copy} copied={copied} />}
          {active === "Tipografiya" && <TypographySection />}
          {active === "Logo & İkon" && <LogoSection />}
          {active === "Post Şablonları" && <PostTemplates />}
          {active === "Grid Sistemi" && <GridSystem />}
          {active === "Caption Şablonları" && <CaptionTemplates copy={copy} copied={copied} />}
          {active === "Platformalar" && <Platforms />}
          {active === "Workflow" && <Workflow />}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string, sub?: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#FFFFFF" }}>{title}</h1>
      {sub && <p style={{ margin: "8px 0 0", color: "#8B949E", fontSize: 14 }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) {
  return <div style={{ background: "#1C2128", border: "1px solid #30363D", borderRadius: 12, padding: 24, ...style }}>{children}</div>;
}

function Tag({ children, color = "#F5C842", style = {} }: { children: React.ReactNode, color?: string, style?: React.CSSProperties }) {
  return <span style={{ background: color + "22", color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: `1px solid ${color}44`, ...style }}>{children}</span>;
}

/* ─── SECTIONS ─────────────────────────────────────── */

function OverviewSection() {
  return (
    <div>
      <SectionTitle title="İcarePro Brand Book" sub="Sosial media üçün vahid vizual dil və content sistemi" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          { icon: "🎨", label: "Brand Identity", val: "Dark Premium" },
          { icon: "📐", label: "Grid Nisbəti", val: "1:1 / 4:5 / 9:16" },
          { icon: "🗣️", label: "Dil Tonu", val: "Sadə & Güvənilir" },
          { icon: "📱", label: "Platformalar", val: "FB · IG · TikTok" },
          { icon: "📅", label: "Post Sıxlığı", val: "5–7/həftə" },
          { icon: "🎯", label: "Target", val: "Əmlak sahibləri" },
        ].map(item => (
          <Card key={item.label}>
            <div style={{ fontSize: 28 }}>{item.icon}</div>
            <div style={{ color: "#8B949E", fontSize: 11, marginTop: 8 }}>{item.label}</div>
            <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 15, marginTop: 2 }}>{item.val}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Brand Positioning</h3>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14 }}>
          İcarePro — Azərbaycanda əmlak sahibləri üçün <strong style={{ color: "#FFFFFF" }}>professional, etibarlı və ağıllı</strong> icarə idarəetmə platformasıdır.
          Vizual dil: <strong style={{ color: "#F5C842" }}>tünd + qızılı</strong> kombinasiyası premium və güvənilirlik hissi verir.
          Ton: texniki deyil, <strong style={{ color: "#FFFFFF" }}>sadə, dostcasına, problemçözücü.</strong>
        </p>
      </Card>

      <div style={{ marginTop: 20, padding: "16px 20px", background: "rgba(245,200,66,0.06)", borderRadius: 8, border: "1px solid rgba(245,200,66,0.2)" }}>
        <strong style={{ color: "#F5C842" }}>💡 Əsas prinsip:</strong>
        <span style={{ color: "#C9D1D9", fontSize: 14, marginLeft: 8 }}>Hər post ya problemə toxunur, ya faydanı göstərir, ya da emosiya yaradır. Heç bir post boş olmamalıdır.</span>
      </div>
    </div>
  );
}

function ColorsSection({ copy, copied }: { copy: (t: string, l: string) => void, copied: string | null }) {
  const palette = [
    { name: "Primary Dark", hex: "#0D1117", use: "Fon, background" },
    { name: "Secondary Dark", hex: "#161B22", use: "Card fon, sidebar" },
    { name: "Card Surface", hex: "#1C2128", use: "Post kartlar" },
    { name: "Gold Primary", hex: "#F5C842", use: "CTA, vurğu, logo" },
    { name: "Gold Dark", hex: "#D4A017", use: "Hover, shadow" },
    { name: "Border", hex: "#30363D", use: "Ayırıcılar, kənarlıq" },
    { name: "White", hex: "#FFFFFF", use: "Başlıqlar" },
    { name: "Light Gray", hex: "#C9D1D9", use: "Əsas mətn" },
    { name: "Muted Gray", hex: "#8B949E", use: "İkinci dərəcəli mətn" },
  ];

  return (
    <div>
      <SectionTitle title="Rəng Palitri" sub="Bütün dizaynlarda yalnız bu rənglər istifadə edilir" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {palette.map(c => (
          <div key={c.hex} onClick={() => copy(c.hex, c.hex)} style={{ cursor: "pointer", borderRadius: 10, overflow: "hidden", border: "1px solid #30363D", transition: "transform 0.1s" }}>
            <div style={{ height: 80, background: c.hex, border: "1px solid #30363D", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {copied === c.hex && <span style={{ background: "#F5C842", color: "#0D1117", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Kopyalandı!</span>}
            </div>
            <div style={{ background: "#1C2128", padding: "10px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#FFFFFF", fontFamily: "monospace" }}>{c.hex}</div>
              <div style={{ color: "#8B949E", fontSize: 11, marginTop: 2 }}>{c.name}</div>
              <div style={{ color: "#F5C842", fontSize: 11, marginTop: 2 }}>{c.use}</div>
            </div>
          </div>
        ))}
      </div>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 16px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Canva üçün Rəng Kodu</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["0D1117", "F5C842", "FFFFFF", "C9D1D9", "1C2128"].map(hex => (
            <div key={hex} onClick={() => copy("#" + hex, hex)} style={{ cursor: "pointer", background: "#0D1117", border: "1px solid #30363D", borderRadius: 6, padding: "6px 12px", fontFamily: "monospace", fontSize: 12, color: "#F5C842" }}>
              #{hex} {copied === hex ? "✓" : ""}
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8B949E" }}>Kopyalamaq üçün üzərinə klikləyin → Canva-da "Custom color" bölməsinə yapışdırın</p>
      </Card>
    </div>
  );
}

function TypographySection() {
  return (
    <div>
      <SectionTitle title="Tipografiya" sub="Şrift sistemi — bütün platformalar üçün vahid" />

      <Card style={{ marginBottom: 16 }}>
        <Tag>Əsas Şrift</Tag>
        <div style={{ marginTop: 16, fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Başlıq H1</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF", marginTop: 8 }}>Alt başlıq H2</div>
          <div style={{ fontSize: 16, fontWeight: 400, color: "#C9D1D9", marginTop: 8, lineHeight: 1.6 }}>Əsas mətn — sadə, oxunaqlı, qısa cümlələr. Hər cümlə bir fikir daşıyır.</div>
          <div style={{ fontSize: 13, color: "#8B949E", marginTop: 8 }}>Caption / Alt mətn — ikinci dərəcəli məlumat</div>
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#0D1117", borderRadius: 8, fontSize: 12, color: "#8B949E" }}>
          <strong style={{ color: "#F5C842" }}>Google Fonts:</strong> Inter (Free) · Canva-da built-in mövcuddur
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { label: "Başlıq (H1)", size: "32–40px", weight: "800 ExtraBold", color: "#FFFFFF", use: "Post başlığı, hook" },
          { label: "Alt başlıq (H2)", size: "20–24px", weight: "700 Bold", color: "#F5C842", use: "Vurğu, faydalar" },
          { label: "Əsas mətn", size: "14–16px", weight: "400 Regular", color: "#C9D1D9", use: "Açıqlama, body" },
          { label: "CTA / Düymə", size: "14px", weight: "700 Bold", color: "#0D1117 on Gold", use: "Call-to-action" },
        ].map(t => (
          <Card key={t.label}>
            <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>{t.label}</div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: 4 }}>{t.size} · {t.weight}</div>
            <div style={{ color: "#F5C842", fontSize: 12 }}>{t.use}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Yazı Qaydaları</h3>
        {[
          "Cümlələr qısa — max 10-12 söz",
          "Emoji — moderasiya ilə (1-3/post)",
          "CAPS LOCK — yalnız hook sözlər üçün",
          "Nöqtə, vergül — düzgün işlədilsin",
          "Sual cümləsi — oxucunu cəlb edir",
        ].map(r => (
          <div key={r} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#C9D1D9" }}>
            <span style={{ color: "#F5C842" }}>→</span> {r}
          </div>
        ))}
      </Card>
    </div>
  );
}

function LogoSection() {
  return (
    <div>
      <SectionTitle title="Logo & İkon Sistemi" sub="Bütün platformalarda vahid logo istifadəsi" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Logo dark bg */}
        <Card>
          <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 }}>Tünd fonda (əsas)</div>
          <div style={{ background: "#0D1117", borderRadius: 8, padding: "32px", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid #30363D" }}>
            <span style={{ fontWeight: 800, fontSize: 32, color: "#F5C842", fontStyle: "italic" }}>İcarə</span>
            <span style={{ fontWeight: 800, fontSize: 32, color: "#FFFFFF" }}>Pro</span>
          </div>
          <Tag style={{ marginTop: 12 }}>Primary — hər yerdə istifadə et</Tag>
        </Card>

        {/* Logo light bg */}
        <Card>
          <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 }}>Açıq fonda (yalnız lazım olsa)</div>
          <div style={{ background: "#F5F5F5", borderRadius: 8, padding: "32px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 32, color: "#D4A017", fontStyle: "italic" }}>İcarə</span>
            <span style={{ fontWeight: 800, fontSize: 32, color: "#0D1117" }}>Pro</span>
          </div>
          <Tag color="#8B949E" style={{ marginTop: 12 }}>Yalnız açıq fon üçün</Tag>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 16px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Avatar / Profile İkonu</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0D1117", fontStyle: "italic" }}>İP</span>
          </div>
          <div style={{ width: 80, height: 80, borderRadius: 16, background: "#0D1117", border: "2px solid #F5C842", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#F5C842", fontStyle: "italic", textAlign: "center" }}>İcarə<br />Pro</span>
          </div>
          <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.7 }}>
            Profile şəkli üçün: <strong style={{ color: "#F5C842" }}>1:1 nisbət, min 400×400px</strong><br />
            Instagram, Facebook, TikTok üçün eyni şəkil<br />
            Ən sadəsi: qızılı dairə + "İP" initials
          </div>
        </div>
      </Card>

      <Card style={{ background: "rgba(255,68,68,0.05)", borderColor: "rgba(255,68,68,0.2)" }}>
        <h3 style={{ margin: "0 0 12px", color: "#FF4444", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>❌ Nə Etmə</h3>
        {["Loqonun rəngini dəyiş", "Loqoya kölgə əlavə et", "Loqonu uzat/sıx", "Loqonu busy fona qoy", "Başqa şrift istifadə et"].map(r => (
          <div key={r} style={{ fontSize: 13, color: "#C9D1D9", marginBottom: 6 }}>✗ {r}</div>
        ))}
      </Card>
    </div>
  );
}

function PostTemplates() {
  const templates = [
    {
      type: "Pain Point Post",
      desc: "Problem → Həll",
      tag: "🔥 Ən yüksək engagement",
      preview: (
        <div style={{ background: "#0D1117", borderRadius: 10, padding: 20, border: "1px solid #30363D", aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#F5C842", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>İcarePro</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 12 }}>İcarəçin pulunu ödəmir?</div>
            <div style={{ fontSize: 13, color: "#8B949E", lineHeight: 1.5 }}>İcarePro ilə hər gecikməni avtomatik görürsən — xatırlatma mesajı göndəririk.</div>
          </div>
          <div style={{ background: "#F5C842", borderRadius: 6, padding: "8px 14px", color: "#0D1117", fontWeight: 700, fontSize: 12, textAlign: "center" }}>Pulsuz sına →</div>
        </div>
      ),
      structure: ["Hook (sual/problem) — 1 cümlə", "Problem genişləndirilməsi — 1-2 cümlə", "İcarePro həlli — 1 cümlə", "CTA — qısa, aydın"],
    },
    {
      type: "Feature Spotlight",
      desc: "Xüsusiyyət tanıtımı",
      tag: "📱 Tutorial / How-to",
      preview: (
        <div style={{ background: "#1C2128", borderRadius: 10, padding: 20, border: "1px solid #F5C842", aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "#F5C842", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📋</div>
            <span style={{ color: "#F5C842", fontWeight: 700, fontSize: 13 }}>YENİ XÜSUSİYYƏT</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 8 }}>Müqavilə 30 saniyədə</div>
            <div style={{ fontSize: 12, color: "#8B949E" }}>PDF avtomatik yaradılır, imzalanmağa hazır</div>
          </div>
          <div style={{ border: "1px solid #F5C842", borderRadius: 6, padding: "6px 14px", color: "#F5C842", fontWeight: 600, fontSize: 12, textAlign: "center" }}>icr.az/demo</div>
        </div>
      ),
      structure: ["İkon + 'YENİ' badge — vizual diqqət", "Xüsusiyyət adı — qısa, güclü", "Fayda — 1 cümlə", "Link/CTA"],
    },
    {
      type: "Stat / Fact",
      desc: "Rəqəm + fakt",
      tag: "📊 Shareble content",
      preview: (
        <div style={{ background: "linear-gradient(135deg, #0D1117 0%, #1C2128 100%)", borderRadius: 10, padding: 20, border: "1px solid #30363D", aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#8B949E", textTransform: "uppercase", letterSpacing: 1 }}>Azərbaycanda İcarə Bazarı</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#F5C842", lineHeight: 1 }}>73%</div>
            <div style={{ fontSize: 14, color: "#C9D1D9", marginTop: 8, lineHeight: 1.5 }}>icarəçi ödənişini geciksə sahibkarlara xatırlatma yoxdur</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#F5C842", fontStyle: "italic" }}>İcarə</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#FFFFFF" }}>Pro</span>
          </div>
        </div>
      ),
      structure: ["Mövzu label — kiçik, yuxarıda", "Böyük rəqəm — dominant element", "Fakt izahı — 1-2 cümlə", "Logo — aşağıda"],
    },
    {
      type: "Before / After",
      desc: "Müqayisə carousel",
      tag: "🔄 Carousel — 2-5 slide",
      preview: (
        <div style={{ background: "#0D1117", borderRadius: 10, padding: 20, border: "1px solid #30363D", aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#F5C842", fontWeight: 600 }}>ƏVVƏL vs İNDİ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#1C2128", borderRadius: 6, padding: 10, border: "1px solid #FF4444" }}>
              <div style={{ color: "#FF4444", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>ƏVVƏL</div>
              <div style={{ fontSize: 11, color: "#8B949E", lineHeight: 1.4 }}>Excel tablolar, itirilmiş sənədlər, gecikmiş bildirişlər</div>
            </div>
            <div style={{ background: "#1C2128", borderRadius: 6, padding: 10, border: "1px solid #00C853" }}>
              <div style={{ color: "#00C853", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>İNDİ</div>
              <div style={{ fontSize: 11, color: "#C9D1D9", lineHeight: 1.4 }}>Hər şey bir platformada, avtomatik, həmişə hazır</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#F5C842", textAlign: "center" }}>icr.az →</div>
        </div>
      ),
      structure: ["Slide 1: Hook sualı", "Slide 2-3: ƏVVƏL — problemlər", "Slide 4-5: İNDİ — İcarePro həlli", "Son slide: CTA + link"],
    },
  ];

  return (
    <div>
      <SectionTitle title="Post Şablonları" sub="Hər format üçün hazır struktur — sadəcə doldur" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {templates.map(t => (
          <Card key={t.type}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: 15 }}>{t.type}</div>
                <div style={{ color: "#8B949E", fontSize: 12, marginTop: 2 }}>{t.desc}</div>
              </div>
              <span style={{ background: "#F5C84222", color: "#F5C842", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, border: "1px solid #F5C84244", whiteSpace: "nowrap" }}>{t.tag}</span>
            </div>
            {t.preview}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "#8B949E", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Struktur</div>
              {t.structure.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#C9D1D9", marginBottom: 4 }}>
                  <span style={{ color: "#F5C842", fontWeight: 700, minWidth: 16 }}>{i + 1}.</span> {s}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GridSystem() {
  const months = [
    { week: "H1", posts: ["Pain Point", "Feature", "Stat", "Story", "TikTok", "Humor", "CTA"] },
    { week: "H2", posts: ["Before/After", "Tutorial", "Fact", "Reel", "TikTok", "Case Study", "Community"] },
    { week: "H3", posts: ["Pain Point", "Feature", "Stat", "Story", "TikTok", "Q&A", "CTA"] },
    { week: "H4", posts: ["Carousel", "Tutorial", "Fact", "Reel", "TikTok", "Review", "Monthly Wrap"] },
  ];

  const postColors: Record<string, string> = {
    "Pain Point": "#FF4444", "Feature": "#F5C842", "Stat": "#00C853",
    "Story": "#8B949E", "TikTok": "#E1306C", "Humor": "#FF9800",
    "CTA": "#F5C842", "Before/After": "#9C27B0", "Tutorial": "#2196F3",
    "Fact": "#00BCD4", "Reel": "#E1306C", "Case Study": "#4CAF50",
    "Community": "#FF9800", "Q&A": "#607D8B", "Carousel": "#9C27B0",
    "Review": "#4CAF50", "Monthly Wrap": "#F5C842",
  };

  return (
    <div>
      <SectionTitle title="Content Grid Sistemi" sub="Aylıq 20-28 post planı — növlərin balansı" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 4, marginBottom: 24 }}>
        {["B.e.", "Ç.a.", "Çər.", "C.a.", "Cüm.", "Şən.", "Baz."].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#8B949E", padding: "6px 0", fontWeight: 600 }}>{d}</div>
        ))}
        {months.flatMap((week, wi) =>
          week.posts.map((post, di) => (
            <div key={`${wi}-${di}`} style={{
              background: (postColors[post] || "#1C2128") + "22",
              border: `1px solid ${(postColors[post] || "#30363D")}44`,
              borderRadius: 6, padding: "6px 4px", textAlign: "center",
              fontSize: 9, color: postColors[post] || "#8B949E", fontWeight: 600,
              minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1.2,
            }}>{post}</div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Content Mix (aylıq)</h3>
          {[
            { type: "Pain Point / Problem", pct: "30%", count: "6-8 post", color: "#FF4444" },
            { type: "Feature / Tutorial", pct: "25%", count: "5-7 post", color: "#F5C842" },
            { type: "Stat / Fact", pct: "20%", count: "4-6 post", color: "#00C853" },
            { type: "Humor / Community", pct: "15%", count: "3-4 post", color: "#FF9800" },
            { type: "CTA / Promo", pct: "10%", count: "2-3 post", color: "#9C27B0" },
          ].map(item => (
            <div key={item.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#C9D1D9" }}>{item.type}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, color: item.color, fontWeight: 700 }}>{item.pct}</span>
                <span style={{ fontSize: 11, color: "#8B949E" }}>{item.count}</span>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Platform Bölgüsü</h3>
          {[
            { platform: "Instagram Feed", icon: "📸", size: "1080×1080 (1:1) · 1080×1350 (4:5)", color: "#E1306C" },
            { platform: "Instagram Stories/Reels", icon: "🎬", size: "1080×1920 (9:16)", color: "#E1306C" },
            { platform: "Facebook Post", icon: "📘", size: "1200×630 · 1:1 də işləyir", color: "#1877F2" },
            { platform: "TikTok Video", icon: "🎵", size: "1080×1920 (9:16) · 15-60 saniyə", color: "#FF0050" },
          ].map(p => (
            <div key={p.platform} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                <span>{p.icon}</span>
                <span style={{ fontWeight: 600, color: "#FFFFFF", fontSize: 12 }}>{p.platform}</span>
              </div>
              <div style={{ fontSize: 11, color: "#8B949E", marginLeft: 20 }}>{p.size}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ background: "rgba(245,200,66,0.05)", borderColor: "rgba(245,200,66,0.2)" }}>
        <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>⏰ Ən Yaxşı Paylaşım Saatları (Bakı vaxtı)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { day: "İş günləri", time: "08:00–09:00 / 19:00–21:00", best: "Səhər başlanğıcı + Axşam" },
            { day: "Şənbə", time: "10:00–12:00", best: "Həftəsonu refresh" },
            { day: "Bazar ertəsi", time: "07:30–09:00", best: "Həftə başlanğıcı hook" },
          ].map(t => (
            <div key={t.day} style={{ background: "#0D1117", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, color: "#FFFFFF", fontSize: 12, marginBottom: 4 }}>{t.day}</div>
              <div style={{ color: "#F5C842", fontSize: 13, fontWeight: 700 }}>{t.time}</div>
              <div style={{ color: "#8B949E", fontSize: 11, marginTop: 2 }}>{t.best}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CaptionTemplates({ copy, copied }: { copy: (t: string, l: string) => void, copied: string | null }) {
  const templates = [
    {
      type: "Pain Point",
      icon: "🔥",
      caption: `İcarəçin ödəməyi gecikdirir, amma sən heç nə bilmirsən?

Bu Azərbaycanda əmlak sahiblərinin ən böyük problemidir — izləmə yoxdur, xatırlatma yoxdur.

İcarePro ilə:
✅ Ödəniş gecikdimi — dərhal bildiriş alırsan
✅ Müqavilə bitmə tarixi — avtomatik xatırlatma
✅ Bütün tarixi — bir yerdə

14 gün pulsuz sına → icr.az

#icare #emlak #baki #icarepro #azerbaycan`,
    },
    {
      type: "Feature",
      icon: "⚡",
      caption: `30 saniyədə müqavilə hazır? Bəli! 📋

İcarePro-da müqavilə yaratmaq:
1️⃣ İcarəçi məlumatlarını daxil et
2️⃣ Obyekti seç
3️⃣ PDF avtomatik yaradılır

Notariusda saat gözləmək lazım deyil.
Hər şey rəqəmsal, hər şey sürətli.

Pulsuz başla → icr.az

#icarepro #emlak #rəqəmsallaşma #baki`,
    },
    {
      type: "Stat",
      icon: "📊",
      caption: `Azərbaycanda əmlak sahiblərinin 68%-i icarə hesabatını Excel-də aparır.

Bu o deməkdir:
❌ İtirilən fayllar
❌ Xətalı hesablamalar  
❌ Bölüşmək çətin

İcarePro ilə — hər şey avtomatik, hər şey bir yerdə.

Sən bu 68%-dənsən? 👇

#emlak #icare #Azerbaijan #icarepro`,
    },
    {
      type: "Humor",
      icon: "😂",
      caption: `Əmlak sahibi olan hər kəs bunu hiss edib 😄

📁 "Müqavilə harada idi?"
📱 "İcarəçiyə zəng et, götürmür"
📊 "Bu ay neçə ödəniş aldım?"

Tanış gəlir? 👀

İcarePro bunların hamısını həll edir — ciddi söyləyirik 😎

Link bio-da 👆

#reallife #emlak #icare #baki #humor`,
    },
  ];

  return (
    <div>
      <SectionTitle title="Caption Şablonları" sub="Kopyala → uyarla → paylaş. Maksimum 5 dəqiqə" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {templates.map(t => (
          <Card key={t.type}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: "#FFFFFF" }}>{t.icon} {t.type}</div>
              <button
                onClick={() => copy(t.caption, t.type)}
                style={{
                  background: copied === t.type ? "#00C853" : "#F5C842",
                  color: "#0D1117", border: "none", borderRadius: 6, padding: "5px 12px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "background 0.2s"
                }}
              >
                {copied === t.type ? "✓ Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <div style={{ background: "#0D1117", borderRadius: 8, padding: 16, fontSize: 12, color: "#C9D1D9", lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #30363D" }}>
              {t.caption}
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ marginTop: 16, background: "rgba(245,200,66,0.05)", borderColor: "rgba(245,200,66,0.2)" }}>
        <h3 style={{ margin: "0 0 12px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Hashtag Strategiyası</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 6 }}>Həmişə istifadə et</div>
            {["#icarepro", "#emlak", "#baki", "#icare", "#azerbaycan"].map(h => (
              <div key={h} style={{ fontSize: 12, color: "#F5C842", marginBottom: 3 }}>{h}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 6 }}>Mövzuya görə</div>
            {["#müqavilə", "#kirayə", "#mülk", "#sahibkar", "#rəqəmsallaşma"].map(h => (
              <div key={h} style={{ fontSize: 12, color: "#C9D1D9", marginBottom: 3 }}>{h}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 6 }}>Növbəli istifadə et</div>
            {["#biznes", "#texnologiya", "#startup", "#app", "#automation"].map(h => (
              <div key={h} style={{ fontSize: 12, color: "#8B949E", marginBottom: 3 }}>{h}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#0D1117", borderRadius: 6, fontSize: 12, color: "#8B949E" }}>
          💡 Instagram: 8-15 hashtag optimal · Facebook: 3-5 hashtag · TikTok: 4-6 hashtag
        </div>
      </Card>
    </div>
  );
}

function Platforms() {
  return (
    <div>
      <SectionTitle title="Platform Qaydaları" sub="Hər platformanın öz dili var — uyarla" />
      {[
        {
          name: "Instagram", icon: "📸", color: "#E1306C",
          specs: { "Feed post": "1080×1080 / 1080×1350", "Story": "1080×1920", "Reel": "1080×1920, 15-90s", "Bio link": "icr.az" },
          tone: "Vizual ağır. Hər şey estetik görünməli. Caption orta uzunluq. CTA bio-ya yönləndir.",
          best: ["Carousel — əsas feature tanıtımı", "Reel — before/after, sürətli tutorial", "Story — Q&A, poll, daily tip"],
          frequency: "4-5 post / həftə",
        },
        {
          name: "Facebook", icon: "📘", color: "#1877F2",
          specs: { "Post": "1200×630 px optimal", "Video": "16:9 horizontal", "Group": "Əmlak sahibləri qrupları", "CTA": "Link direkt caption-da" },
          tone: "Daha uzun caption işləyir. Izahat tələb edən mövzular. Professional ton. Link post-da birbaşa qoyulabilir.",
          best: ["Uzun caption pain point postlar", "Stat/fact postlar — shareble", "Video testimonials", "Group postlar — tanış sistemi"],
          frequency: "3-4 post / həftə",
        },
        {
          name: "TikTok", icon: "🎵", color: "#FF0050",
          specs: { "Video": "1080×1920, 9:16", "Uzunluq": "15-60 saniyə optimal", "Hook": "İlk 3 saniyə kritikdir", "Caption": "Qısa, 1-2 cümlə" },
          tone: "Ən sürətli, ən sadə. Telefon kamerası kifayət edir. Real, authentic content çalışır. Trending audio.",
          best: ["Day in the life — əmlak sahibi", "\"Bu hata edilir\" formatı", "Sürətli tutorial — screen recording", "Trending challenge + İcarePro twist"],
          frequency: "3-5 video / həftə",
        },
      ].map(p => (
        <Card key={p.name} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>{p.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#FFFFFF" }}>{p.name}</div>
              <div style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>{p.frequency}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#8B949E", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Texniki Ölçülər</div>
              {Object.entries(p.specs).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#8B949E" }}>{k}: </span>
                  <span style={{ fontSize: 12, color: "#C9D1D9", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8B949E", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Ton & Üslub</div>
              <div style={{ fontSize: 12, color: "#C9D1D9", lineHeight: 1.7 }}>{p.tone}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8B949E", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Ən Yaxşı Formatlar</div>
              {p.best.map(b => (
                <div key={b} style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 12, color: "#C9D1D9" }}>
                  <span style={{ color: p.color }}>→</span> {b}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Workflow() {
  const steps = [
    {
      step: "01", title: "Aylıq Plan (30 dəq/ay)",
      desc: "Hər ayın əvvəlində 28 postun mövzusunu müəyyən et. Content mix-ə uy: 30% pain, 25% feature, 20% stat...",
      tools: ["Notion / Google Sheets — content calendar", "Claude — mövzu generasiyası"],
      output: "28 postun başlığı + növü + tarixi",
    },
    {
      step: "02", title: "Həftəlik Batch (2 saat/həftə)",
      desc: "Bazar günü — növbəti həftənin 5-7 postunu hazırla. Hər şeyi bir oturuşda.",
      tools: ["Canva — vizual dizayn (şablondan)", "Claude — caption yazmaq"],
      output: "7 hazır post (şəkil + caption + hashtag)",
    },
    {
      step: "03", title: "Canva Şablon Sistemi",
      desc: "1 dəfə hər növ üçün şablon yarat. Sonra sadəcə mətn + rəng dəyişdir. Max 5 dəqiqə/post.",
      tools: ["Canva Pro — Brand Kit qur", "Rəngləri brand kitdən saxla"],
      output: "Hər post üçün 5 dəq dizayn",
    },
    {
      step: "04", title: "Claude ilə Caption (5 dəq/post)",
      desc: "Prompt: \"İcarePro üçün [növ] post yaz. Azərbaycanca. Ton: [sadə/professional]. Mövzu: [X]\"",
      tools: ["Claude Sonnet / Haiku", "Şablonları uyarla + edit et"],
      output: "Hazır caption + hashtag",
    },
    {
      step: "05", title: "Scheduling (10 dəq/həftə)",
      desc: "Meta Business Suite ilə FB + IG-ni eyni anda planla. TikTok-u manual yüklə.",
      tools: ["Meta Business Suite — FB + IG", "TikTok app — manual upload"],
      output: "Həftə boyu avtomatik paylaşım",
    },
    {
      step: "06", title: "Analitika (15 dəq/həftə)",
      desc: "Hər həftənin sonunda: ən çox engagement alan 2-3 post. Növbəti həftəyə uyarla.",
      tools: ["Meta Insights", "TikTok Analytics"],
      output: "Top post növü → daha çox et",
    },
  ];

  return (
    <div>
      <SectionTitle title="SMM Workflow" sub="Minimum vaxt, maksimum nəticə — həftəlik sistem" />

      <div style={{ padding: "16px 20px", background: "rgba(245,200,66,0.06)", borderRadius: 10, border: "1px solid rgba(245,200,66,0.2)", marginBottom: 24 }}>
        <strong style={{ color: "#F5C842" }}>💡 Cəmi vaxt:</strong>
        <span style={{ color: "#C9D1D9", fontSize: 14, marginLeft: 8 }}>
          2 saat/həftə + 30 dəq/ay planlama = tam SMM sistemi
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {steps.map((s) => (
          <Card key={s.step} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "start" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#F5C842" }}>
              {s.step}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {s.tools.map(t => (
                  <span key={t} style={{ background: "#0D1117", border: "1px solid #30363D", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#8B949E" }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.2)", borderRadius: 8, padding: "8px 12px", minWidth: 160 }}>
              <div style={{ fontSize: 10, color: "#00C853", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Output</div>
              <div style={{ fontSize: 11, color: "#C9D1D9", lineHeight: 1.5 }}>{s.output}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 16px", color: "#F5C842", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Claude Prompt Şablonu (kopyala)</h3>
        <div style={{ background: "#0D1117", borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#C9D1D9", lineHeight: 1.8, border: "1px solid #30363D" }}>
          <span style={{ color: "#F5C842" }}>Rola:</span> İcarePro SMM mütəxəssisi<br />
          <span style={{ color: "#F5C842" }}>Məhsul:</span> Azərbaycan bazarı üçün icarə idarəetmə SaaS platforması<br />
          <span style={{ color: "#F5C842" }}>Hədəf auditoriya:</span> 2-20 mülk sahibi olan sahibkarlar<br />
          <span style={{ color: "#F5C842" }}>Post növü:</span> [PAIN POINT / FEATURE / STAT / HUMOR]<br />
          <span style={{ color: "#F5C842" }}>Ton:</span> Sadə, dostcasına, Azərbaycanca<br />
          <span style={{ color: "#F5C842" }}>Mövzu:</span> [X problemini həll edirik]<br />
          <span style={{ color: "#F5C842" }}>Uzunluq:</span> Max 150 söz + 8-12 hashtag<br />
          <span style={{ color: "#F5C842" }}>CTA:</span> icr.az-a yönləndir
        </div>
      </Card>
    </div>
  );
}

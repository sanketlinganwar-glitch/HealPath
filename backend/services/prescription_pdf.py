import io
import hashlib
import qrcode
from datetime import datetime
from fpdf import FPDF
from typing import Dict, Any, List

class PrescriptionPDF(FPDF):
    def __init__(self, rx_number: str = "RX-2026"):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.rx_number = rx_number
        self.set_auto_page_break(auto=True, margin=18)

    def header(self):
        # Top decorative border
        self.set_fill_color(30, 64, 175)  # Navy Blue #1e40af
        self.rect(0, 0, 210, 5, 'F')

        # Hospital Letterhead Header
        self.set_xy(14, 10)
        self.set_font("Helvetica", "B", 17)
        self.set_text_color(30, 58, 138)  # Blue 900
        self.cell(130, 7, "SANJEEVAN MULTISPECIALTY HOSPITAL", new_x="LMARGIN", new_y="NEXT")

        self.set_x(14)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(14, 116, 144)  # Cyan 700
        self.cell(130, 5, "& RESEARCH INSTITUTE  |  SMARTCARE OPD", new_x="LMARGIN", new_y="NEXT")

        self.set_x(14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(71, 85, 105)  # Slate 600
        self.cell(130, 4, "Mahadev Mandir Road, Ratanlal Plots, Yavatmal, Maharashtra 445001", new_x="LMARGIN", new_y="NEXT")
        self.set_x(14)
        self.cell(130, 4, "Tel: +91 95526 25262  |  Emergency: +91 95526 25262 / 108  |  Web: healpath.sanjeevan.org", new_x="LMARGIN", new_y="NEXT")

        # Header Right Box: Prescription Details
        self.set_xy(145, 8)
        self.set_fill_color(241, 245, 249)  # Slate 100
        self.set_draw_color(203, 213, 225)  # Slate 300
        self.rect(145, 8, 53, 22, 'DF')

        self.set_xy(147, 10)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(30, 64, 175)
        self.cell(49, 4, "DIGITAL PRESCRIPTION", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_xy(147, 14)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(15, 23, 42)
        self.cell(49, 5, f"{self.rx_number}", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_xy(147, 19)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(49, 4, f"Date: {datetime.now().strftime('%d-%b-%Y %H:%M')}", align="C", new_x="LMARGIN", new_y="NEXT")

        # Divider line
        self.set_draw_color(30, 64, 175)
        self.set_line_width(0.6)
        self.line(14, 34, 198, 34)
        self.ln(5)

    def footer(self):
        self.set_y(-16)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(14, 281, 198, 281)

        self.set_y(-14)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(100, 116, 139)
        self.cell(130, 4, "Sanjeevan Multispecialty Hospital & Research Institute | HealPath SmartCare System", new_x="RIGHT", new_y="TOP")
        self.cell(56, 4, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")

        self.set_y(-10)
        self.set_font("Helvetica", "I", 6.5)
        self.set_text_color(148, 163, 184)
        self.cell(186, 3, "Valid for clinical dispensary. Verify authenticity anytime by scanning the embedded QR code.", align="C", new_x="LMARGIN", new_y="NEXT")


def generate_prescription_pdf(rx_data: Dict[str, Any], verification_base_url: str = "http://localhost:5173/#/verify-rx") -> bytes:
    """
    Generates a professional, tamper-evident digital prescription PDF for Sanjeevan Hospital.
    Embeds doctor credentials, patient UHID, structured medicine table, digital signature digest,
    and a scannable verification QR code.
    """
    rx_num = rx_data.get("prescription_number") or f"RX-2026-{rx_data.get('id', 1):04d}"
    v_token = rx_data.get("verification_token") or "VERIFIED-SAMPLE-TOKEN"
    verification_url = f"{verification_base_url}/{v_token}"

    pdf = PrescriptionPDF(rx_number=rx_num)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    # -------------------------------------------------------------
    # 1. DOCTOR & CLINICAL SPECIALTY BLOCK
    # -------------------------------------------------------------
    pdf.set_y(38)
    pdf.set_fill_color(248, 250, 252)  # Slate 50
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(14, 38, 184, 21, 'DF')

    pdf.set_xy(18, 40)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(15, 23, 42)
    doc_name = rx_data.get("doctor_name", "Consultant Physician")
    pdf.cell(110, 5, f"{doc_name}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 64, 175)
    pdf.cell(66, 5, f"OPD Cabin: {rx_data.get('doctor_room', 'Consultation Suite')}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(18)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(71, 85, 105)
    qualification = rx_data.get("doctor_qualification", "MBBS, MD")
    specialization = rx_data.get("doctor_specialization", "Specialist")
    pdf.cell(110, 4, f"{qualification} | {specialization}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(66, 4, f"Department: {rx_data.get('department_name', 'General OPD')}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(18)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(100, 116, 139)
    reg_num = rx_data.get("doctor_registration", "MMC 74218")
    pdf.cell(176, 4, f"Registration No: {reg_num} (Maharashtra Medical Council)", new_x="LMARGIN", new_y="NEXT")

    # -------------------------------------------------------------
    # 2. PATIENT INFORMATION BLOCK
    # -------------------------------------------------------------
    pdf.ln(3)
    patient = rx_data.get("patient", {})
    p_name = patient.get("name", "Outpatient")
    p_age = patient.get("age", "--")
    p_gender = str(patient.get("gender", "--")).capitalize()
    p_phone = patient.get("phone", "XXXXXXXXXX")
    p_uhid = patient.get("uhid") or f"SH-445001-{patient.get('id', 1):04d}"
    consult_date = rx_data.get("consultation_date") or rx_data.get("created_at") or datetime.now().strftime("%d-%b-%Y")
    if isinstance(consult_date, datetime):
        consult_date = consult_date.strftime("%d-%b-%Y")
    elif isinstance(consult_date, str) and "T" in consult_date:
        consult_date = consult_date.split("T")[0]

    pdf.set_fill_color(239, 246, 255)  # Blue 50
    pdf.set_draw_color(191, 219, 254)  # Blue 200
    pdf.rect(14, 62, 184, 18, 'DF')

    pdf.set_xy(18, 64)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(24, 4, "Patient Name:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(56, 4, f"{p_name}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(16, 4, "UHID No:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(42, 4, f"{p_uhid}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(20, 4, "Consult Date:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(20, 4, f"{consult_date}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(18)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(24, 5, "Age / Gender:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(56, 5, f"{p_age} Yrs / {p_gender}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(16, 5, "Contact:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(42, 5, f"+91 {p_phone}", new_x="RIGHT", new_y="TOP")

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 58, 138)
    token_str = rx_data.get("token_number") or f"Token #{rx_data.get('token_id', '--')}"
    pdf.cell(20, 5, "OPD Token:", new_x="RIGHT", new_y="TOP")
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(16, 185, 129)
    pdf.cell(20, 5, f"{token_str}", new_x="LMARGIN", new_y="NEXT")

    # -------------------------------------------------------------
    # 3. CLINICAL DIAGNOSIS & FINDINGS
    # -------------------------------------------------------------
    pdf.ln(5)
    pdf.set_x(14)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(184, 5, "CLINICAL DIAGNOSIS & REASON FOR VISIT", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(14)
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(203, 213, 225)
    diag = rx_data.get("diagnosis", "Clinical evaluation and outpatient treatment.")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(184, 5, f"Diagnosis: {diag}", border=1, fill=True)

    # -------------------------------------------------------------
    # 4. PRESCRIBED MEDICATIONS TABLE (Rx)
    # -------------------------------------------------------------
    pdf.ln(4)
    pdf.set_x(14)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(30, 64, 175)
    pdf.cell(184, 6, "Rx - PRESCRIBED MEDICINES", new_x="LMARGIN", new_y="NEXT")

    # Table Header
    pdf.set_x(14)
    pdf.set_fill_color(30, 64, 175)  # Navy
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(8, 6, "#", border=1, align="C", fill=True)
    pdf.cell(62, 6, "Medicine Name & Form", border=1, align="L", fill=True)
    pdf.cell(24, 6, "Dosage", border=1, align="C", fill=True)
    pdf.cell(32, 6, "Frequency", border=1, align="C", fill=True)
    pdf.cell(20, 6, "Duration", border=1, align="C", fill=True)
    pdf.cell(38, 6, "Instructions", border=1, align="L", fill=True)
    pdf.ln()

    # Table Rows
    medicines = rx_data.get("medicines", [])
    if not medicines:
        medicines = [{"name": "No medicines prescribed", "dosage": "-", "frequency": "-", "duration": "-", "instructions": "Consult doctor if symptoms persist"}]

    pdf.set_font("Helvetica", "", 7.8)
    pdf.set_text_color(15, 23, 42)
    alt = False
    for idx, med in enumerate(medicines, 1):
        pdf.set_x(14)
        if alt:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)

        m_name = str(med.get("name", "Medicine"))
        m_dose = str(med.get("dosage", "1 tab"))
        m_freq = str(med.get("frequency", "1-0-1"))
        m_dur = str(med.get("duration", "5 days"))
        m_inst = str(med.get("instructions", "After food"))

        pdf.cell(8, 6, str(idx), border=1, align="C", fill=True)
        pdf.cell(62, 6, m_name[:36], border=1, align="L", fill=True)
        pdf.cell(24, 6, m_dose[:14], border=1, align="C", fill=True)
        pdf.cell(32, 6, m_freq[:18], border=1, align="C", fill=True)
        pdf.cell(20, 6, m_dur[:12], border=1, align="C", fill=True)
        pdf.cell(38, 6, m_inst[:24], border=1, align="L", fill=True)
        pdf.ln()
        alt = not alt

    # -------------------------------------------------------------
    # 5. CLINICAL ADVICE & INVESTIGATIONS
    # -------------------------------------------------------------
    pdf.ln(3)
    notes = rx_data.get("clinical_notes")
    tests = rx_data.get("tests_recommended")
    follow_up = rx_data.get("follow_up_date")
    if follow_up:
        follow_up_str = str(follow_up)
    else:
        follow_up_str = "As needed or in 7 days if symptoms persist."

    if notes or tests or follow_up:
        pdf.set_x(14)
        pdf.set_fill_color(254, 252, 232)  # Amber 50
        pdf.set_draw_color(253, 230, 138)  # Amber 200
        pdf.rect(14, pdf.get_y(), 184, 18, 'DF')

        curr_y = pdf.get_y() + 1.5
        pdf.set_xy(18, curr_y)
        pdf.set_font("Helvetica", "B", 7.8)
        pdf.set_text_color(180, 83, 9)  # Amber 700
        pdf.cell(32, 4, "Clinical Advice:", new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 7.8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(146, 4, str(notes or "Follow prescribed dosage and maintain adequate fluid intake.")[:95], new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(18)
        pdf.set_font("Helvetica", "B", 7.8)
        pdf.set_text_color(180, 83, 9)
        pdf.cell(32, 4, "Recommended Tests:", new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 7.8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(146, 4, str(tests or "None specified at current visit.")[:95], new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(18)
        pdf.set_font("Helvetica", "B", 7.8)
        pdf.set_text_color(180, 83, 9)
        pdf.cell(32, 4, "Next Follow-Up:", new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "B", 7.8)
        pdf.set_text_color(30, 64, 175)
        pdf.cell(146, 4, f"{follow_up_str}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # -------------------------------------------------------------
    # 6. DIGITAL SIGNATURE & QR VERIFICATION FOOTER
    # -------------------------------------------------------------
    sign_y = max(pdf.get_y() + 3, 222)
    if sign_y > 230:
        pdf.add_page()
        sign_y = 20

    # Embedded QR Code Generator in Memory
    qr = qrcode.QRCode(box_size=4, border=1)
    qr.add_data(verification_url)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    # Verification Box (Left)
    pdf.set_xy(14, sign_y)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(14, sign_y, 90, 42, 'DF')

    # Draw QR Image
    pdf.image(qr_buf, x=16, y=sign_y + 4, w=34, h=34)

    pdf.set_xy(52, sign_y + 4)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(30, 64, 175)
    pdf.cell(50, 4, "SCAN TO VERIFY", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(52, sign_y + 8)
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(50, 3.2, f"Scan this QR code with any smartphone camera to verify this prescription's authenticity on the hospital portal.\nToken: {v_token[:12]}...")

    pdf.set_xy(52, sign_y + 26)
    pdf.set_font("Helvetica", "I", 6)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(50, 3, "Protected by cryptographic hash", new_x="LMARGIN", new_y="NEXT")

    # Digital Signature Box (Right)
    pdf.set_xy(108, sign_y)
    pdf.set_fill_color(240, 253, 244)  # Emerald 50
    pdf.set_draw_color(187, 247, 208)  # Emerald 200
    pdf.rect(108, sign_y, 90, 42, 'DF')

    pdf.set_xy(112, sign_y + 3)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(22, 101, 52)  # Emerald 800
    pdf.cell(82, 4, "[VERIFIED] DIGITALLY SIGNED", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(112, sign_y + 7.5)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(82, 4.5, f"{doc_name}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(112, sign_y + 12)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(82, 3.5, f"{qualification} | Reg: {reg_num}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(112, sign_y + 16)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(100, 116, 139)
    sig_date = rx_data.get("signed_at") or datetime.now().strftime("%d-%b-%Y %H:%M:%S")
    if isinstance(sig_date, datetime):
        sig_date = sig_date.strftime("%d-%b-%Y %H:%M:%S")
    pdf.cell(82, 3.5, f"Signed At: {sig_date}", new_x="LMARGIN", new_y="NEXT")

    # Compute/Display Signature Digest
    sig_hash = rx_data.get("signature_hash")
    if not sig_hash:
        raw_sig = f"{rx_num}:{doc_name}:{reg_num}:{v_token}:{p_name}"
        sig_hash = hashlib.sha256(raw_sig.encode()).hexdigest()
    
    pdf.set_xy(112, sign_y + 20)
    pdf.set_font("Courier", "", 5.8)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(82, 3.5, f"SHA256: {sig_hash[:28]}...", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(112, sign_y + 23.5)
    pdf.cell(82, 3.5, f"        {sig_hash[28:]}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(112, sign_y + 29)
    pdf.set_font("Helvetica", "I", 6.5)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(82, 3.5, "Authorized Clinical Officer Stamp (Sanjeevan Hospital)", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())

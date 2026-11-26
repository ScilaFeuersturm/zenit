from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import KeepTogether, LongTable, Paragraph, SimpleDocTemplate, Spacer, Table

from app.models.quote import QuoteRequest, QuoteRequestStatus

INK = colors.HexColor("#25211D")
MUTED = colors.HexColor("#645A50")
GOLD = colors.HexColor("#A77527")
CREAM = colors.HexColor("#F8F1E5")
LINE = colors.HexColor("#E6DFD4")
STATUS = {
    QuoteRequestStatus.PENDIENTE: "Pendiente",
    QuoteRequestStatus.APROBADA: "Aprobado",
    QuoteRequestStatus.RECHAZADA: "Rechazado",
    QuoteRequestStatus.MODIFICADA: "Modificado",
}


def money(amount: float) -> str:
    formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",").replace(" ", ".")
    return f"$ {formatted}"


def render_quote_pdf(quote: QuoteRequest) -> bytes:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=45,
        rightMargin=45,
        topMargin=47,
        bottomMargin=48,
        title=f"Presupuesto {quote.id:05d} | Zenit Eventos",
        author="Zenit Eventos",
    )
    width = document.width - 12
    body = ParagraphStyle("Body", fontName="Helvetica", fontSize=10, leading=15, textColor=INK)
    detail = ParagraphStyle("Detail", parent=body, textColor=MUTED)
    table_number = ParagraphStyle("Number", parent=body, alignment=TA_RIGHT)
    column_label = ParagraphStyle("Column", parent=body, fontName="Helvetica-Bold", textColor=colors.white)
    column_number = ParagraphStyle("Column number", parent=column_label, alignment=TA_RIGHT)
    brand = ParagraphStyle("Brand", parent=body, fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=GOLD)
    heading = ParagraphStyle("Heading", parent=body, fontName="Helvetica-Bold", fontSize=30, leading=35)
    total_label = ParagraphStyle("Total", parent=body, fontName="Helvetica-Bold", fontSize=12, leading=16)
    total_amount = ParagraphStyle("Amount", parent=total_label, alignment=TA_RIGHT)

    fields = [f"<b>Cliente</b> {escape(quote.client.full_name)}"]
    if quote.desired_date:
        fields.append(f"<b>Fecha solicitada</b> {quote.desired_date:%d/%m/%Y}")
    if quote.guests_count is not None:
        fields.append(f"<b>Invitados</b> {quote.guests_count}")
    fields.append(f"<b>Estado</b> {STATUS[quote.status]}")

    story = [
        Paragraph("ZENIT EVENTOS", brand),
        Spacer(1, 9),
        Paragraph(f"Presupuesto #{quote.id:05d}", heading),
        Spacer(1, 5),
        Paragraph(f"Solicitud del {quote.created_at:%d/%m/%Y}", detail),
        Spacer(1, 20),
        *[Paragraph(field, body) for field in fields],
        Spacer(1, 19),
    ]

    rows = [[
        Paragraph("Servicio o insumo", column_label),
        Paragraph("Cantidad", column_number),
        Paragraph("Precio unitario", column_number),
        Paragraph("Subtotal", column_number),
    ]]
    for item in quote.items:
        name = item.service.name if item.service else f"Servicio #{item.service_id}"
        rows.append([
            Paragraph(escape(name), body),
            Paragraph(str(item.quantity), table_number),
            Paragraph(money(item.unit_price), table_number),
            Paragraph(money(item.subtotal), table_number),
        ])

    story.append(LongTable(
        rows,
        colWidths=[width - 298, 76, 111, 111],
        repeatRows=1,
        splitInRow=1,
        style=[
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F4")]),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ],
    ))
    summary = Table(
        [[Paragraph("Total estimado (ARS)", total_label), Paragraph(money(quote.estimated_total), total_amount)]],
        colWidths=[width / 2, width / 2],
        style=[
            ("BACKGROUND", (0, 0), (-1, -1), CREAM),
            ("LINEABOVE", (0, 0), (-1, 0), 1, GOLD),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ],
    )
    story.append(KeepTogether([Spacer(1, 12), summary]))

    def draw_footer(canvas, doc):
        canvas.setStrokeColor(LINE)
        canvas.line(51, 40, A4[0] - 51, 40)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 9)
        canvas.drawString(51, 26, "Zenit Eventos")
        canvas.drawRightString(A4[0] - 51, 26, f"Página {doc.page}")

    document.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return output.getvalue()

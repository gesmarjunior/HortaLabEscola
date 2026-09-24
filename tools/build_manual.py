from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "manual-de-uso-hortalab-escola.pdf"
IMAGES = ROOT / "assets" / "images"
SCREENSHOTS = ROOT / "screenshots"

PAGE_W, PAGE_H = A4
CONTENT_W = 179 * mm

GREEN_950 = HexColor("#17483D")
GREEN_900 = HexColor("#1F5D4C")
GREEN_700 = HexColor("#3F7B61")
LEAF = HexColor("#69A84F")
LEAF_LIGHT = HexColor("#DDEBD5")
SAND = HexColor("#F2E6C9")
SAND_LIGHT = HexColor("#FAF5E9")
TERRACOTTA = HexColor("#D8753C")
TERRACOTTA_DARK = HexColor("#A84E27")
BLUE = HexColor("#4F9DD9")
BLUE_LIGHT = HexColor("#E7F3FB")
YELLOW = HexColor("#E8B64A")
BACKGROUND = HexColor("#F7F8F4")
INK = HexColor("#24302B")
MUTED = HexColor("#596761")
LINE = HexColor("#D5DED7")
WHITE = colors.white


def register_fonts():
    fonts = Path("C:/Windows/Fonts")
    candidates = {
        "HortaSans": fonts / "segoeui.ttf",
        "HortaSans-Bold": fonts / "segoeuib.ttf",
        "HortaSans-Semibold": fonts / "seguisb.ttf",
        "HortaSans-Italic": fonts / "segoeuii.ttf",
    }
    for name, path in candidates.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    if "HortaSans" not in pdfmetrics.getRegisteredFontNames():
        return "Helvetica", "Helvetica-Bold", "Helvetica-Bold", "Helvetica-Oblique"
    return "HortaSans", "HortaSans-Bold", "HortaSans-Semibold", "HortaSans-Italic"


FONT, FONT_BOLD, FONT_SEMIBOLD, FONT_ITALIC = register_fonts()


styles = {
    "cover_kicker": ParagraphStyle(
        "cover_kicker", fontName=FONT_BOLD, fontSize=9, leading=11,
        textColor=TERRACOTTA_DARK, spaceAfter=6, tracking=1.4,
    ),
    "cover_title": ParagraphStyle(
        "cover_title", fontName=FONT_BOLD, fontSize=31, leading=34,
        textColor=GREEN_950, spaceAfter=10,
    ),
    "cover_lead": ParagraphStyle(
        "cover_lead", fontName=FONT, fontSize=12.5, leading=18,
        textColor=MUTED, spaceAfter=14,
    ),
    "kicker": ParagraphStyle(
        "kicker", fontName=FONT_BOLD, fontSize=8, leading=10,
        textColor=TERRACOTTA_DARK, spaceAfter=4, tracking=1.2,
    ),
    "h1": ParagraphStyle(
        "h1", fontName=FONT_BOLD, fontSize=24, leading=28,
        textColor=GREEN_950, spaceAfter=8,
    ),
    "lead": ParagraphStyle(
        "lead", fontName=FONT, fontSize=11.2, leading=16,
        textColor=MUTED, spaceAfter=12,
    ),
    "h2": ParagraphStyle(
        "h2", fontName=FONT_BOLD, fontSize=14, leading=17,
        textColor=GREEN_900, spaceBefore=8, spaceAfter=6,
    ),
    "h3": ParagraphStyle(
        "h3", fontName=FONT_BOLD, fontSize=10.5, leading=13,
        textColor=GREEN_950, spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "body", fontName=FONT, fontSize=9.6, leading=14,
        textColor=INK, spaceAfter=7,
    ),
    "small": ParagraphStyle(
        "small", fontName=FONT, fontSize=8.2, leading=11.5,
        textColor=MUTED,
    ),
    "tiny": ParagraphStyle(
        "tiny", fontName=FONT, fontSize=7.2, leading=9.5,
        textColor=MUTED,
    ),
    "card_title": ParagraphStyle(
        "card_title", fontName=FONT_BOLD, fontSize=10, leading=12,
        textColor=GREEN_950, spaceAfter=3,
    ),
    "card_body": ParagraphStyle(
        "card_body", fontName=FONT, fontSize=8.4, leading=11.5,
        textColor=INK,
    ),
    "center_small": ParagraphStyle(
        "center_small", fontName=FONT, fontSize=8, leading=10.5,
        textColor=MUTED, alignment=TA_CENTER,
    ),
    "step_number": ParagraphStyle(
        "step_number", fontName=FONT_BOLD, fontSize=12, leading=14,
        textColor=WHITE, alignment=TA_CENTER,
    ),
}


class RoundedCropImage(Flowable):
    def __init__(self, path, width, height, radius=10, border=True):
        super().__init__()
        self.path = str(path)
        self.width = width
        self.height = height
        self.radius = radius
        self.border = border

    def draw(self):
        canvas = self.canv
        image = ImageReader(self.path)
        image_w, image_h = image.getSize()
        scale = max(self.width / image_w, self.height / image_h)
        draw_w, draw_h = image_w * scale, image_h * scale
        x = (self.width - draw_w) / 2
        y = (self.height - draw_h) / 2
        canvas.saveState()
        clip = canvas.beginPath()
        clip.roundRect(0, 0, self.width, self.height, self.radius)
        canvas.clipPath(clip, stroke=0, fill=0)
        canvas.drawImage(image, x, y, draw_w, draw_h, mask="auto")
        canvas.restoreState()
        if self.border:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.8)
            canvas.roundRect(0, 0, self.width, self.height, self.radius, stroke=1, fill=0)


def p(text, style="body"):
    return Paragraph(text, styles[style])


def page_intro(number, title, lead):
    return [
        p(f"{number} / MANUAL DE USO", "kicker"),
        p(title, "h1"),
        p(lead, "lead"),
        HRFlowable(width="100%", thickness=0.8, color=LINE, spaceAfter=12),
    ]


def bullets(items, style="body"):
    rows = []
    for item in items:
        rows.append([
            Paragraph("<b>-</b>", ParagraphStyle("bullet", parent=styles[style], textColor=LEAF, leftIndent=0)),
            Paragraph(item, styles[style]),
        ])
    table = Table(rows, colWidths=[5 * mm, CONTENT_W - 5 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def callout(title, text, color=BLUE, background=BLUE_LIGHT):
    content = [p(title, "card_title"), p(text, "card_body")]
    table = Table([[content]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.7, color),
        ("LINEBEFORE", (0, 0), (0, -1), 4, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def card(title, text, width, accent=LEAF, background=WHITE):
    table = Table([[[p(title, "card_title"), p(text, "card_body")]]], colWidths=[width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEABOVE", (0, 0), (-1, 0), 4, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


def three_cards(items):
    gap = 4 * mm
    width = (CONTENT_W - 2 * gap) / 3
    cells = [card(title, text, width, accent, background) for title, text, accent, background in items]
    table = Table([cells], colWidths=[width, width, width], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), gap),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def two_columns(left, right, ratio=(1, 1)):
    gap = 7 * mm
    usable = CONTENT_W - gap
    left_w = usable * ratio[0] / sum(ratio)
    right_w = usable * ratio[1] / sum(ratio)
    table = Table([[left, right]], colWidths=[left_w, right_w], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, -1), gap),
        ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def screenshot(path, caption, width=CONTENT_W, height=None):
    img = Image(str(path))
    source_w, source_h = img.imageWidth, img.imageHeight
    height = height or width * source_h / source_w
    img.drawWidth = width
    img.drawHeight = height
    image_table = Table([[img]], colWidths=[width])
    image_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return KeepTogether([image_table, Spacer(1, 3), p(caption, "tiny")])


def steps_table():
    labels = ["Sua escola", "Tamanho", "Espaços", "Organize", "Aulas e cuidados", "Teste o plano", "Plano final"]
    number_cells = []
    label_cells = []
    for index, label in enumerate(labels, start=1):
        number = Table([[p(str(index), "step_number")]], colWidths=[10 * mm], rowHeights=[10 * mm])
        number.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN_900 if index in (1, 7) else LEAF),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0, GREEN_900),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        number_cells.append(number)
        label_cells.append(p(label, "center_small"))
    widths = [CONTENT_W / 7] * 7
    table = Table([number_cells, label_cells], colWidths=widths, rowHeights=[12 * mm, 12 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return table


def draw_leaf_logo(canvas, x, y, scale=1):
    canvas.saveState()
    canvas.setStrokeColor(GREEN_900)
    canvas.setLineWidth(1.8 * scale)
    canvas.line(x, y, x, y + 15 * scale)
    canvas.setFillColor(LEAF)
    canvas.ellipse(x - 10 * scale, y + 10 * scale, x, y + 18 * scale, stroke=0, fill=1)
    canvas.setFillColor(GREEN_900)
    canvas.ellipse(x, y + 14 * scale, x + 10 * scale, y + 22 * scale, stroke=0, fill=1)
    canvas.restoreState()


def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setTitle("Manual de uso - HortaLab Escola")
    canvas.setAuthor("HortaLab Escola")
    canvas.setSubject("Manual de uso do planejador de hortas escolares agroecológicas")
    canvas.setFillColor(BACKGROUND)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(SAND_LIGHT)
    canvas.circle(PAGE_W - 32 * mm, PAGE_H - 16 * mm, 48 * mm, stroke=0, fill=1)
    canvas.setFillColor(LEAF_LIGHT)
    canvas.circle(15 * mm, 16 * mm, 34 * mm, stroke=0, fill=1)
    draw_leaf_logo(canvas, 25 * mm, PAGE_H - 29 * mm, 1.05)
    canvas.setFont(FONT_BOLD, 12)
    canvas.setFillColor(GREEN_900)
    canvas.drawString(34 * mm, PAGE_H - 24 * mm, "HortaLab")
    canvas.setFont(FONT, 12)
    canvas.drawString(56 * mm, PAGE_H - 24 * mm, "Escola")
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 16 * mm, "Produto educacional para planejamento de hortas escolares")
    canvas.drawRightString(PAGE_W - 20 * mm, 16 * mm, "Versão 2.4.2 | setembro de 2026")
    canvas.restoreState()


def draw_page(canvas, doc):
    canvas.saveState()
    draw_leaf_logo(canvas, 20 * mm, PAGE_H - 20 * mm, 0.55)
    canvas.setFont(FONT_BOLD, 8.5)
    canvas.setFillColor(GREEN_900)
    canvas.drawString(26 * mm, PAGE_H - 15.5 * mm, "HortaLab Escola")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(20 * mm, PAGE_H - 20 * mm, PAGE_W - 20 * mm, PAGE_H - 20 * mm)
    canvas.line(20 * mm, 15 * mm, PAGE_W - 20 * mm, 15 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 9.5 * mm, "Manual de uso | hortalab escola")
    canvas.drawRightString(PAGE_W - 20 * mm, 9.5 * mm, f"{doc.page}")
    canvas.restoreState()


def build_story():
    story = []

    story.extend([
        Spacer(1, 30 * mm),
        p("MANUAL DE USO | VERSÃO 2.4.2", "cover_kicker"),
        p("Planeje, organize e revise a horta da escola.", "cover_title"),
        p("Um guia passo a passo para professores e equipes gestoras usarem o HortaLab Escola com segurança, clareza e autonomia.", "cover_lead"),
        RoundedCropImage(IMAGES / "hero-planejamento.jpg", CONTENT_W, 73 * mm, radius=12),
        Spacer(1, 7 * mm),
        three_cards([
            ("Feito para a escola", "Linguagem direta e percurso guiado para apoiar decisões pedagógicas e organizacionais.", GREEN_900, WHITE),
            ("Privacidade", "Não pede nomes, e-mails ou dados da escola. O plano permanece neste dispositivo.", BLUE, BLUE_LIGHT),
            ("Uso responsável", "O resultado orienta conversas. Não substitui avaliações técnicas realizadas no local.", TERRACOTTA, SAND_LIGHT),
        ]),
        PageBreak(),
    ])

    story.extend(page_intro("01", "Comece por aqui", "O HortaLab ajuda a transformar uma ideia de horta em um plano que a equipe escolar possa discutir, revisar e adaptar."))
    story.extend([
        p("Acesse o planejador", "h2"),
        callout(
            "Endereço da versão publicada",
            '<link href="https://gesmarjunior.github.io/HortaLabEscola/index.html" color="#1F5D4C"><u>gesmarjunior.github.io/HortaLabEscola</u></link><br/>Também é possível executar o projeto localmente, sem internet, conforme as instruções do README.',
            GREEN_900,
            LEAF_LIGHT,
        ),
        Spacer(1, 6 * mm),
        p("O percurso possui sete etapas", "h2"),
        steps_table(),
        Spacer(1, 6 * mm),
        two_columns(
            [p("Antes de responder", "h2"), bullets([
                "Converse com quem participará do projeto.",
                "Use estimativas quando ainda não houver medidas confirmadas.",
                "Não informe nome da escola, estudantes ou servidores.",
                "Tenha em mente que o plano poderá ser alterado a qualquer momento.",
            ], "small")],
            [p("O que o HortaLab entrega", "h2"), bullets([
                "Comparação entre cenários de 12, 25 e 50 m².",
                "Composição e maquete 3D da horta.",
                "Atividades pedagógicas e plano de cuidados.",
                "Revisão de riscos, indicadores explicados e plano final.",
            ], "small")],
        ),
        Spacer(1, 6 * mm),
        callout("Importante", "Não existe um tamanho universal de horta escolar. Água, equipe, circulação, calendário, finalidade pedagógica e capacidade de cuidado devem orientar a escolha.", TERRACOTTA, SAND_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("02", "Conheça a tela", "A navegação foi organizada para mostrar uma decisão por vez. O plano é salvo automaticamente no navegador."))
    story.extend([
        screenshot(SCREENSHOTS / "journey-start-v2.4-desktop.png", "Tela inicial do planejador. A linha numerada mostra a etapa atual e o que ainda falta concluir.", height=93 * mm),
        Spacer(1, 5 * mm),
        three_cards([
            ("1. Etapas", "Os números mostram o percurso. Depois de visitar uma etapa, você pode voltar a ela para revisar escolhas.", LEAF, LEAF_LIGHT),
            ("2. Plano salvo aqui", "O indicador no topo confirma que as mudanças foram guardadas neste navegador e neste dispositivo.", BLUE, BLUE_LIGHT),
            ("3. Ajuda e cartilha", "Abre conteúdos de apoio, checklists, referências e o botão para baixar este manual.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 5 * mm),
        p("Acesso pelo teclado", "h2"),
        bullets([
            "Use Tab para avançar entre campos e botões e Shift + Tab para voltar.",
            "Pressione Enter ou Espaço para ativar botões e selecionar itens.",
            "Na maquete 3D, use as setas do teclado depois de selecionar um objeto.",
            "O foco visível indica qual controle será acionado.",
        ], "small"),
        PageBreak(),
    ])

    story.extend(page_intro("03", "Etapa 1 - Conte como é a realidade da escola", "O diagnóstico inicial ajuda o sistema a interpretar recursos, restrições e condições que ainda precisam ser confirmadas."))
    story.extend([
        two_columns(
            [
                p("Espaço e recursos", "h2"),
                bullets([
                    "Finalidade principal da horta.",
                    "Área aproximadamente disponível.",
                    "Quantidade de sol observada.",
                    "Acesso e regularidade da água.",
                    "Condição conhecida do solo.",
                    "Necessidades de acesso e participação.",
                ], "small"),
            ],
            [
                p("Equipe e continuidade", "h2"),
                bullets([
                    "Número de pessoas que dividirão os cuidados.",
                    "Plano para férias e recessos.",
                    "Situação do orçamento.",
                    "Ferramentas e local seguro para guardá-las.",
                ], "small"),
            ],
        ),
        Spacer(1, 7 * mm),
        callout("Use a opção 'Ainda não...' quando necessário", "Uma resposta pendente não impede o planejamento. Ela aparece depois como algo que precisa ser confirmado na escola.", BLUE, BLUE_LIGHT),
        Spacer(1, 7 * mm),
        p("Como responder bem", "h2"),
        three_cards([
            ("Observe", "Se possível, confira sol e água em mais de um horário. O comportamento pode mudar ao longo do dia e do ano.", GREEN_900, LEAF_LIGHT),
            ("Seja realista", "Considere apenas as pessoas que realmente poderão manter a rotina, inclusive nos períodos sem aulas.", TERRACOTTA, SAND_LIGHT),
            ("Confirme depois", "Área, solo, drenagem, segurança e acessibilidade precisam ser verificados no local antes da implantação.", BLUE, BLUE_LIGHT),
        ]),
        Spacer(1, 8 * mm),
        p("Para avançar", "h2"),
        p("Depois de revisar as respostas, selecione <b>Comparar tamanhos</b>. Você poderá voltar a esta etapa sem perder o restante do plano."),
        PageBreak(),
    ])

    story.extend(page_intro("04", "Etapa 2 - Escolha um tamanho possível", "Compare os cenários como hipóteses de planejamento, não como recomendações universais."))
    story.extend([
        three_cards([
            ("12 m² | Micro-horta", "Boa para começar pequeno, trabalhar com poucos recipientes ou canteiros e testar uma rotina com equipe reduzida.", LEAF, LEAF_LIGHT),
            ("25 m² | Horta compacta", "Permite combinar cultivo, circulação, água e uma zona de apoio para um projeto pedagógico delimitado.", TERRACOTTA, SAND_LIGHT),
            ("50 m² | Aprendizagem ampliada", "Comporta mais zonas, mas exige água, pessoas, calendário e acompanhamento compatíveis. Não é um padrão ideal.", BLUE, BLUE_LIGHT),
        ]),
        Spacer(1, 8 * mm),
        p("Como decidir", "h2"),
        bullets([
            "Compare o tamanho com a área informada no diagnóstico.",
            "Considere quanto espaço será necessário para caminhos e manobra.",
            "Pergunte se a equipe consegue cuidar da horta durante todo o calendário.",
            "Prefira um cenário menor quando água, orçamento ou responsáveis forem incertos.",
            "Lembre que a área produtiva não precisa ocupar todo o terreno disponível.",
        ]),
        Spacer(1, 6 * mm),
        callout("Referência de 50 m²", "19,8 m² de canteiros + 17,2 m² de caminhos e manobra + 4,0 m² de água, mudas e ferramentas + 3,0 m² de compostagem opcional + 6,0 m² de observação e atividade pedagógica = 50,0 m².", GREEN_900, LEAF_LIGHT),
        Spacer(1, 7 * mm),
        p("Para avançar", "h2"),
        p("Clique no cartão do cenário desejado e depois em <b>Escolher os espaços</b>. O cenário escolhido traz uma composição inicial que pode ser ajustada."),
        PageBreak(),
    ])

    story.extend(page_intro("05", "Etapa 3 - Escolha o que a horta terá", "Nesta etapa você define a composição: quais funções existirão e quanto espaço cada uma ocupará."))
    story.extend([
        screenshot(SCREENSHOTS / "composition-desktop-v2.png", "Composição do cenário de 50 m². A barra mostra o total utilizado e o mapa representa as zonas escolhidas.", height=93 * mm),
        Spacer(1, 5 * mm),
        three_cards([
            ("Adicionar", "Use o botão + na lista de itens. O sistema só adiciona o componente quando existe área livre.", LEAF, LEAF_LIGHT),
            ("Ajustar", "Selecione uma zona no mapa ou na lista para alterar sua área, mudar a ordem ou removê-la.", BLUE, BLUE_LIGHT),
            ("Revisar", "Use Desfazer e Refazer. Alterne entre Mapa e Lista se uma dessas formas for mais confortável.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 5 * mm),
        callout("Se o total ultrapassar o cenário", "O HortaLab bloqueia a mudança e explica que não há área livre. Reduza ou remova outro item antes de tentar novamente.", YELLOW, SAND_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("06", "Etapa 4 - Organize a horta em 3D", "A maquete ajuda a conversar sobre proximidade, circulação, acesso e cuidado. Ela não é uma planta técnica."))
    story.extend([
        screenshot(SCREENSHOTS / "layout-desktop-v2.png", "Maquete 3D do cenário ampliado. O ponto de água está selecionado e pode ser reposicionado.", height=93 * mm),
        Spacer(1, 5 * mm),
        three_cards([
            ("Selecionar", "Clique ou toque diretamente no objeto. Você também pode selecionar o mesmo item na lista lateral.", LEAF, LEAF_LIGHT),
            ("Mover", "Depois da seleção, use os quatro botões direcionais ou as setas do teclado. O objeto segue a direção mostrada na tela.", BLUE, BLUE_LIGHT),
            ("Ver melhor", "Use + e - para ajustar o tamanho da imagem. O botão circular gira a vista sem inverter os comandos direcionais.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 5 * mm),
        callout("O que observar", "Garanta caminhos compreensíveis, aproximação ao ponto de água, espaço de manobra e acesso seguro às áreas pedagógicas. Confirme todas as medidas no local.", GREEN_900, LEAF_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("07", "Etapa 5 - Planeje as aulas e os cuidados", "A horta ganha sentido educacional quando a equipe define o que será investigado, registrado e cuidado."))
    story.extend([
        p("Escolha pelo menos duas atividades", "h2"),
        three_cards([
            ("Ciências e ambiente", "Germinação, solo, água, biodiversidade, resíduos, compostagem e consumo responsável.", LEAF, LEAF_LIGHT),
            ("Matemática e território", "Medidas, áreas, proporções, registros, clima, território e sistemas alimentares.", BLUE, BLUE_LIGHT),
            ("Linguagens e participação", "Diário de campo, relatórios, comunicação, desenho, sinalização, orçamento e responsabilidades.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 7 * mm),
        p("Escreva uma intenção simples", "h2"),
        callout("Exemplo", "Acompanhar a germinação durante seis semanas, medir o crescimento uma vez por semana e produzir um diário coletivo com hipóteses, dados e desenhos.", BLUE, BLUE_LIGHT),
        Spacer(1, 7 * mm),
        p("Combine a rotina de cuidado", "h2"),
        bullets([
            "Frequência de cuidado durante os dias letivos.",
            "Pessoa ou equipe substituta quando o responsável principal faltar.",
            "Forma de registrar gastos e materiais utilizados.",
            "Critérios para reduzir ou pausar a horta quando faltarem condições.",
        ]),
        Spacer(1, 7 * mm),
        callout("Para avançar", "O botão <b>Testar o plano</b> é liberado depois que pelo menos duas atividades forem escolhidas.", GREEN_900, LEAF_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("08", "Etapa 6 - Teste o plano", "Simule imprevistos para antecipar decisões e entender como as escolhas alteram a leitura do plano."))
    story.extend([
        screenshot(SCREENSHOTS / "review-v2.4-desktop.png", "Exemplo de restrição de água. A escolha atualiza o plano e os quatro indicadores explicados.", height=93 * mm),
        Spacer(1, 5 * mm),
        two_columns(
            [p("Como usar", "h2"), bullets([
                "Escolha uma situação no menu.",
                "Leia o problema apresentado.",
                "Marque o que a escola faria.",
                "Leia a consequência educativa.",
                "Teste outra decisão quando desejar.",
            ], "small")],
            [p("Como ler os indicadores", "h2"), bullets([
                "Meio ambiente: água, solo e compostagem.",
                "Participação e acesso: caminhos, inclusão e segurança.",
                "Organização: equipe, continuidade, registros e pausa.",
                "Uso nas aulas: atividades, perguntas e registros.",
            ], "small")],
        ),
        Spacer(1, 5 * mm),
        callout("Não é nota nem certificação", "Os valores usam regras fixas e transparentes para apoiar a revisão. Não preveem produtividade, aprendizagem ou autorização para implantar a horta.", TERRACOTTA, SAND_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("09", "Etapa 7 - Leia e compartilhe o plano final", "O relatório reúne o diagnóstico, o cenário, a composição, as aulas, os cuidados, os imprevistos e os próximos passos."))
    story.extend([
        p("Revise antes de compartilhar", "h2"),
        two_columns(
            [bullets([
                "Confira se o cenário escolhido ainda é adequado.",
                "Revise a área ocupada por cada componente.",
                "Confirme as atividades e a intenção pedagógica.",
                "Observe alertas e informações pendentes.",
            ], "small")],
            [bullets([
                "Verifique responsáveis, substitutos e férias.",
                "Leia as decisões tomadas nos imprevistos.",
                "Use os próximos passos para organizar a conversa da equipe.",
                "Confirme condições agronômicas e de segurança no local.",
            ], "small")],
        ),
        Spacer(1, 7 * mm),
        p("Botões do plano final", "h2"),
        three_cards([
            ("Imprimir ou salvar em PDF", "Abre a tela de impressão do navegador. Escolha 'Salvar como PDF' quando quiser um documento para enviar ou arquivar.", GREEN_900, LEAF_LIGHT),
            ("Salvar uma cópia do plano", "Baixa um arquivo leve com as escolhas. Use essa opção para transportar o plano entre navegadores ou dispositivos.", BLUE, BLUE_LIGHT),
            ("Salvar cópia completa", "Baixa o banco local completo. É útil como cópia de segurança do trabalho realizado neste dispositivo.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 7 * mm),
        callout("Antes de apagar ou trocar de computador", "Salve pelo menos uma cópia do plano. O salvamento automático pertence ao navegador e não acompanha a conta do usuário.", YELLOW, SAND_LIGHT),
        Spacer(1, 7 * mm),
        p("Começar outro planejamento", "h2"),
        p("Use <b>Apagar este plano e começar outro</b> apenas depois de salvar as cópias necessárias. Essa ação limpa o planejamento atual do dispositivo."),
        PageBreak(),
    ])

    story.extend(page_intro("10", "Salvamento, cópias e continuidade", "O HortaLab não envia informações para servidores. O plano é guardado localmente no navegador por meio de um banco SQLite incorporado."))
    story.extend([
        three_cards([
            ("Salvamento automático", "Acontece enquanto você responde e organiza o plano. Procure o aviso 'Plano salvo aqui' no alto da tela.", GREEN_900, LEAF_LIGHT),
            ("Cópia do plano", "Arquivo indicado para compartilhar as escolhas ou continuar em outro dispositivo. Ele é validado antes de ser aberto.", BLUE, BLUE_LIGHT),
            ("Cópia completa", "Arquivo SQLite com o estado local completo. Guarde-o em uma pasta conhecida, com data no nome se necessário.", TERRACOTTA, SAND_LIGHT),
        ]),
        Spacer(1, 8 * mm),
        p("Como abrir uma cópia", "h2"),
        bullets([
            "Vá até a etapa Plano final.",
            "Selecione <b>Abrir uma cópia salva</b>.",
            "Escolha o arquivo que foi baixado anteriormente.",
            "Aguarde a mensagem de confirmação.",
            "Revise o cenário, as áreas e as decisões antes de continuar.",
        ]),
        Spacer(1, 7 * mm),
        callout("Privacidade", "Nenhuma resposta é enviada pelo HortaLab. Ao compartilhar manualmente um arquivo exportado, verifique se as anotações pedagógicas não contêm nomes ou outros dados pessoais.", GREEN_900, LEAF_LIGHT),
        Spacer(1, 7 * mm),
        callout("Atenção ao navegador", "Limpar os dados do site, usar navegação privada ou trocar de navegador pode remover o plano salvo automaticamente. As cópias baixadas continuam disponíveis na pasta escolhida.", TERRACOTTA, SAND_LIGHT),
        PageBreak(),
    ])

    story.extend(page_intro("11", "Soluções rápidas", "A maioria das dúvidas pode ser resolvida revendo a etapa atual ou recarregando a página uma vez."))
    troubleshooting = [
        ("O botão para avançar não foi liberado", "Leia a mensagem próxima ao botão. Em Aulas e cuidados, por exemplo, é necessário escolher pelo menos duas atividades."),
        ("Não consigo adicionar outro item", "A área do cenário está completa. Reduza a área de um item ou remova um componente antes de adicionar outro."),
        ("As setas da maquete não funcionam", "Primeiro clique no objeto 3D ou escolha o item na lista lateral. Os botões são liberados depois da seleção."),
        ("O plano anterior não apareceu", "Confirme se você está usando o mesmo navegador e dispositivo. Se tiver uma cópia, use Abrir uma cópia salva."),
        ("A versão publicada parece antiga", "Recarregue com Ctrl + F5. O navegador atualizará os arquivos guardados para funcionamento offline."),
        ("Preciso imprimir somente o plano", "Use o botão Imprimir ou salvar em PDF dentro da etapa Plano final. Os controles de edição não aparecem na impressão."),
    ]
    rows = []
    for question, answer in troubleshooting:
        rows.append([p(question, "card_title"), p(answer, "card_body")])
    table = Table(rows, colWidths=[58 * mm, CONTENT_W - 58 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), LEAF_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([
        table,
        Spacer(1, 8 * mm),
        p("Onde encontrar mais ajuda", "h2"),
        bullets([
            "Abra <b>Ajuda e cartilha</b> no topo do planejador.",
            "Consulte os checklists, o glossário e as referências acadêmicas da cartilha.",
            "Use este manual como roteiro durante reuniões de planejamento.",
        ]),
        PageBreak(),
    ])

    story.extend(page_intro("12", "Checklist final de uso responsável", "Antes de tratar o plano como pronto para discussão, confira os itens abaixo com a equipe."))
    story.extend([
        two_columns(
            [p("No HortaLab", "h2"), bullets([
                "Diagnóstico revisado.",
                "Cenário compatível com os recursos.",
                "Cultivo, circulação e apoio representados.",
                "Maquete 3D organizada.",
                "Duas ou mais atividades escolhidas.",
                "Rotina e substitutos definidos.",
                "Imprevistos testados.",
                "Cópia do plano salva.",
            ], "small")],
            [p("Na escola", "h2"), bullets([
                "Área, sol, água e drenagem confirmados.",
                "Acessibilidade avaliada com os participantes.",
                "Segurança e armazenamento verificados.",
                "Orçamento e responsabilidades acordados.",
                "Férias e recessos planejados.",
                "Orientações técnicas obtidas quando necessárias.",
                "Calendário pedagógico alinhado.",
                "Revisão coletiva agendada.",
            ], "small")],
        ),
        Spacer(1, 8 * mm),
        callout("Limites do produto", "O HortaLab é um recurso educacional. Não certifica viabilidade, não garante produtividade ou aprendizagem e não substitui avaliação agronômica, nutricional, sanitária, de acessibilidade, de segurança ou de conformidade local.", TERRACOTTA, SAND_LIGHT),
        Spacer(1, 8 * mm),
        p("Planejar é construir uma hipótese coletiva", "h2"),
        p("Use o plano para tornar visíveis as escolhas, as responsabilidades e as dúvidas. Uma horta menor, bem cuidada e integrada às aulas pode ser mais adequada do que uma área grande sem continuidade."),
        Spacer(1, 8 * mm),
        callout(
            "Continue no HortaLab Escola",
            '<link href="https://gesmarjunior.github.io/HortaLabEscola/index.html" color="#1F5D4C"><u>Abrir o planejador</u></link>  |  <link href="https://gesmarjunior.github.io/HortaLabEscola/cartilha.html" color="#1F5D4C"><u>Ler a cartilha digital</u></link>',
            GREEN_900,
            LEAF_LIGHT,
        ),
    ])
    return story


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=27 * mm,
        bottomMargin=21 * mm,
        title="Manual de uso - HortaLab Escola",
        author="HortaLab Escola",
        subject="Guia de uso do planejador de hortas escolares",
    )
    doc.build(build_story(), onFirstPage=draw_cover, onLaterPages=draw_page)
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())

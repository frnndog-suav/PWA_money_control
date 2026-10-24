import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineElement,
  PointElement,
} from 'chart.js'
import { selectionHighlightPlugin } from '@/features/charts/chart/selectionHighlightPlugin'

// RF-06 — registra só o que os gráficos usam (rosca, barras e linha), para o Chart.js não
// levar escalas, plugins e elementos inteiros ao pacote. Os controladores (DoughnutController,
// BarController, LineController) já são registrados pelos componentes do react-chartjs-2.
// Tooltip e Legend ficam de fora de propósito: os detalhes vão para o painel fixo e a legenda
// é uma lista (CA-06.2 / CA-06.3).
Chart.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  selectionHighlightPlugin,
)

// A mesma pilha de fontes do sistema que o Tailwind usa no resto do app.
Chart.defaults.font.family =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
Chart.defaults.font.size = 12
// Sem animações: a seleção precisa acompanhar o dedo (CA-06.5) e o gráfico não "pisca" ao
// trocar de período.
Chart.defaults.animation = false

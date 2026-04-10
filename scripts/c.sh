#!/usr/bin/env bash

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}┌─────────────────────────────────┐${NC}"
echo -e "${BLUE}│     Paso Chile Hoy · Commit      │${NC}"
echo -e "${BLUE}└─────────────────────────────────┘${NC}"
echo ""
echo -e "Tipo de cambio:"
echo -e "  ${GREEN}1${NC} feat     → nueva funcionalidad"
echo -e "  ${GREEN}2${NC} fix      → corrección de bug"
echo -e "  ${GREEN}3${NC} style    → cambios visuales/CSS"
echo -e "  ${GREEN}4${NC} refactor → mejora de código"
echo -e "  ${GREEN}5${NC} chore    → configs, deps, etc"
echo -e "  ${GREEN}6${NC} perf     → mejora de rendimiento"
echo -e "  ${GREEN}7${NC} docs     → documentación"
echo ""
read -p "Número (1-7): " TYPE_NUM

case $TYPE_NUM in
  1) TYPE="feat" ;;
  2) TYPE="fix" ;;
  3) TYPE="style" ;;
  4) TYPE="refactor" ;;
  5) TYPE="chore" ;;
  6) TYPE="perf" ;;
  7) TYPE="docs" ;;
  *) echo "Tipo inválido"; exit 1 ;;
esac

echo ""
read -p "Descripción breve: " DESC

if [ -z "$DESC" ]; then
  echo "La descripción no puede estar vacía"
  exit 1
fi

MSG="$TYPE: $DESC"

echo ""
echo -e "${YELLOW}Commit: ${MSG}${NC}"
read -p "¿Confirmar? (Enter = sí, n = no): " CONFIRM

if [ "$CONFIRM" = "n" ]; then
  echo "Cancelado."
  exit 0
fi

git add .
git commit -m "$MSG"
git push

echo ""
echo -e "${GREEN}✓ Push listo${NC}"

const UIBase = require("./uiBase");

class UITableView extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.currentPage = 0;
        this.columnGroups = [5, 4, 2, 5, 3];
        this.nrPages = this.columnGroups.length;
    }

    getValue(col) {
        return typeof col.value === 'function' ? col.value() : col.value;
    }

    padValue(value, padding, alignment = 'left') {
        const strValue = String(value);
        if (alignment === 'right') {
            return strValue.padStart(padding);
        } else {
            return strValue.padEnd(padding);
        }
    }

    formatValue(value, isSelected, isEditing) {
        if (isEditing) return `[${value}]`;
        if (isSelected) return `<${value}>`;
        return value;
    }

    getColumnWidths(templateRow) {
        const startCol = this.getStartCol();
        const endCol = startCol + this.columnGroups[this.currentPage];
        return templateRow.cols.slice(startCol, endCol).map((col, index) => {
            const maxContentWidth = Math.max(
                col.name.length,
                ...this.rows
                    .filter(row => row.cols)
                    .map(row => String(this.getValue(row.cols[startCol + index])).length)
            );
            return Math.max(maxContentWidth, col.padding || 0);
        });
    }

    getStartCol() {
        return this.columnGroups.slice(0, this.currentPage).reduce((sum, group) => sum + group, 0);
    }

    renderHeader(templateRow, colWidths) {
        const startCol = this.getStartCol();
        const headers = templateRow.cols.slice(startCol, startCol + this.columnGroups[this.currentPage]).map((col, index) => 
            this.padValue(col.name, colWidths[index])
        ).join(' | ');
        console.log('  ' + headers + '  ');
        console.log('-'.repeat(headers.length + 4));
    }

    renderTableRow(row, rowIndex, colWidths) {
        const isSelectedRow = rowIndex === this.editRow;
        const startCol = this.getStartCol();
    
        const rowData = row.cols.slice(startCol, startCol + this.columnGroups[this.currentPage]).map((col, colIndex) => {
            const globalColIndex = startCol + colIndex;
            const isSelectedCol = globalColIndex === this.editCol && isSelectedRow;
            const isEditingCol = this.isEditingField && isSelectedCol;
            const value = this.getValue(col);
            let formattedValue = this.formatValue(value, isSelectedCol, isEditingCol);
            return this.padValue(formattedValue, colWidths[colIndex], col.alignment);
        });
    
        const rowString = (isSelectedRow && this.currentPage > 0 ? '< ' : '  ') 
            + rowData.join(' | ') 
            + (isSelectedRow && this.currentPage < this.nrPages - 1 ? ' >' : '  ');
    
        console.log(rowString);
    }

    render() {
        if (this.rows.length === 0) return;
    
        const templateRow = this.rows.find(row => row.cols);
        
        if (templateRow) {
            // Ensure the current page is valid
            this.currentPage = Math.min(this.currentPage, this.nrPages - 1);
    
            const colWidths = this.getColumnWidths(templateRow);
            this.renderHeader(templateRow, colWidths);
    
            this.rows.forEach((row, rowIndex) => {
                if (row.cols) {
                    this.renderTableRow(row, rowIndex, colWidths);
                } else {
                    // Handle special rows (e.g., "Add new note series")
                    const isSelectedRow = rowIndex === this.editRow;
                    const isEditingRow = this.isEditingField && isSelectedRow;
                    if (row.rowRender) {
                        console.log(row.rowRender({isSelected: isSelectedRow, isEditing: isEditingRow, row}));
                    } else {
                        console.log(this.renderRow(row, rowIndex, isSelectedRow, isEditingRow));
                    }
                }
            });
        } else {
            super.render();
        }
    }

    handleLeftRight(delta) {
        const templateRow = this.rows.find(row => row.cols);
        if (!templateRow) return super.handleLeftRight(delta);
    
        const totalCols = templateRow.cols.length;
    
        if (this.isEditingField) {
            this.handleNavigation(delta, 10);
        } else {
            this.editCol = (this.editCol + delta + totalCols) % totalCols;
            let accumulatedCols = 0;
            for (let i = 0; i < this.columnGroups.length; i++) {
                accumulatedCols += this.columnGroups[i];
                if (this.editCol < accumulatedCols) {
                    this.currentPage = i;
                    break;
                }
            }
        }
    }

    handleNavigation(direction, step = 1) {
        if (this.isEditingField) {
            const currentRow = this.rows[this.editRow];
            if (currentRow.cols && currentRow.cols[this.editCol] && currentRow.cols[this.editCol].handle) {
                currentRow.cols[this.editCol].handle(direction, step);
            }
        } else {
            super.handleNavigation(direction, step);
        }
    }
}

module.exports = UITableView;
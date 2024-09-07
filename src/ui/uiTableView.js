const UIBase = require("./uiBase");

class UITableView extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    padValue(value, padding, alignment = 'left') {
        const strValue = String(value);
        return alignment === 'right' ? strValue.padStart(padding) : strValue.padEnd(padding);
    }

    getValue(col) {
        return typeof col.value === 'function' ? col.value() : col.value;
    }

    getColumnWidths(templateRow) {
        return templateRow.cols.map((col, index) => {
            const maxContentWidth = Math.max(
                col.name.length,
                ...this.rows
                    .filter(row => row.cols)
                    .map(row => String(this.getValue(row.cols[index])).length)
            );
            return Math.max(maxContentWidth, col.padding || 0);
        });
    }

    renderHeader(templateRow, colWidths) {
        const headers = templateRow.cols.map((col, index) => 
            this.padValue(col.name, colWidths[index])
        ).join(' | ');
        console.log(headers);
        console.log('-'.repeat(headers.length));
    }

    renderTableRow(row, rowIndex, colWidths) {
        const isSelectedRow = rowIndex === this.editRow;
        const rowData = row.cols.map((col, colIndex) => {
            const isSelectedCol = colIndex === this.editCol && isSelectedRow;
            const isEditingCol = this.isEditingField && isSelectedCol;
            const value = this.getValue(col);
            const formattedValue = this.formatValue(value, isSelectedCol, isEditingCol);
            return this.padValue(formattedValue, colWidths[colIndex], col.alignment);
        });
        console.log(rowData.join(' | '));
    }

    render() {
        if (this.rows.length === 0) return;

        const templateRow = this.rows.find(row => row.cols);
        
        if (templateRow) {
            const colWidths = this.getColumnWidths(templateRow);
            this.renderHeader(templateRow, colWidths);

            this.rows.forEach((row, rowIndex) => {
                if (row.cols) {
                    this.renderTableRow(row, rowIndex, colWidths);
                } else {
                    const isSelectedRow = rowIndex === this.editRow;
                    const isEditingRow = this.isEditingField && isSelectedRow;
                    console.log(this.renderRow(row, rowIndex, isSelectedRow, isEditingRow));
                }
            });
        } else {
            super.render();
        }
    }
}

module.exports = UITableView;
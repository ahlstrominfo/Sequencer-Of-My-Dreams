class UIBase {
    constructor(terminalUI, sequencer) {
        this.terminalUI = terminalUI;
        this.sequencer = sequencer;
        this.editRow = 0;
        this.editCol = 0;
        this.isEditingField = false;
        this.rows = []; 
    }

    openView() {
        // nothing here used in subclasses
    }

    formatValue(value, isSelected, isEditing) {
        if (isEditing) return `[${value}]`;
        if (isSelected) return `<${value}>`;
        return value;
    };

    renderRow(row, _index, isSelected, isEditing) {
        let value = row.value !== undefined ? row.value : '';
        value = typeof value === 'function' ? value() : value;
        const prefix = isSelected ? '>' : ' ';
        const formattedValue = row.cols ? value : this.formatValue(value, isSelected, isEditing);
        if (row.rowRender) {
            return row.rowRender({
                prefix, formattedValue, isSelected, isEditing, row
            });
        }
        return `${prefix} ${row.name}${formattedValue !== undefined ? ': '+formattedValue : ''}`;
    }

    renderColumn(col, _index, isSelected, isEditing, row) {
        const prefix = isSelected ? '>' : ' ';
        const value = typeof col.value === 'function' ? col.value() : col.value;
        const formattedValue = this.formatValue(value, isSelected, isEditing);
        
        if (col.colRender) {
            return col.colRender({
                prefix, value, formattedValue, isSelected, isEditing, row
            });
        }
        
        if(row.colRender) {
            return row.colRender({
                prefix, value, formattedValue, isSelected, isEditing, row}
            );
        }
        
        if (!col.value && col.enter) {
            if (isSelected) {
                return ` >${col.name}< `;
            }
            return ` ${col.name} `;
        }
        if (row.colsLayout === 0) {
            if (isSelected) {
                return `>${col.value()}<`;
            }
            return `${col.value()}`;
        }

        if (col.name !== undefined) {
            return ` ${col.name}: ${formattedValue} `;
        } else {
            return ` ${formattedValue} `;
        }
        
    }

    renderColumns(row, isSelectedRow, isEditingRow) {
        return row.cols.map((col, colIndex) => {
            const isSelectedCol = colIndex === this.editCol && isSelectedRow;
            const isEditingCol = isEditingRow && isSelectedCol;
            return this.renderColumn(col, colIndex, isSelectedCol, isEditingCol, row);
        });
    }

    render() {
        this.rows && this.rows.forEach((row, rowIndex) => {
            const isSelectedRow = rowIndex === this.editRow;
            const isEditingRow = this.isEditingField && isSelectedRow;

            if (row.selectable === false) {
                row.rowRender = ({row}) => {
                    return `${row.name !== undefined ? row.name : ''}`;
                };
            }

            const rowString = this.renderRow(row, rowIndex, isSelectedRow, isEditingRow);

            if (row.cols) {
                const columnStrings = this.renderColumns(row, isSelectedRow, isEditingRow);
                
                if (row.layout === 1) {
                    // Layout 1: Row and its columns on the same line
                    console.log(rowString + columnStrings.join(''));
                } else {
                    // Layout 2 (default): Row on its own line, each column on a separate line
                    console.log(rowString);
                    columnStrings.forEach(colString => console.log('  ' + colString));
                }
            } else {
                console.log(rowString);
            }
        });
    }

    handleNavigation(direction, step = 1) {
        if (this.isEditingField) {
            // this.terminalUI.log.unshift(`editRow: ${this.editRow}, editCol: ${this.editCol}, handle: ${this.rows[this.editRow].cols[this.editCol].handle}`);
            this.rows[this.editRow].handle 
                && this.rows[this.editRow].handle(direction, step);

            this.rows[this.editRow].cols 
                && this.rows[this.editRow].cols[this.editCol] 
                && this.rows[this.editRow].cols[this.editCol].handle 
                && this.rows[this.editRow].cols[this.editCol].handle(direction, step);
        } else {
            let newRow = this.editRow;
            do {
                newRow = ((newRow - direction) + this.rows.length) % this.rows.length;
            } while (this.rows[newRow].selectable === false && newRow !== this.editRow);
        
            this.editRow = newRow;
        }
    }
    

    handleEnter() {
        if (this.rows[this.editRow].cols && this.rows[this.editRow].cols[this.editCol] && this.rows[this.editRow].cols[this.editCol].enter) {
            this.rows[this.editRow].cols[this.editCol].enter();
        } else if (this.rows[this.editRow].enter) {
            this.rows[this.editRow].enter();
            return;
        } else if (this.isEditingField) {
            this.isEditingField = false;    
        } else {
            this.isEditingField = true;
        }
    }

    handleEscape() {
    }

    handleLeave() {
    }

    // eslint-disable-next-line no-unused-vars
    adjustField(_delta, _step = 1) {
    }

    handleLeftRight(delta) {
        if (this.isEditingField) {
            this.handleNavigation(delta, 10);
        } else {
            let row = this.rows[this.editRow];
            if (row.cols) {
                let newCol = this.editCol;
                do {
                    newCol = ((newCol + delta) + row.cols.length) % row.cols.length;
                } while (row.cols[newCol].selectable === false && newCol !== this.editCol);
            
                this.editCol = newCol;
            }
        }
    }
}

module.exports = UIBase;
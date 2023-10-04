import { useMemo } from "react";
import { ListActionValue, ObjectItem } from "mendix";
import { SelectionType } from "@mendix/widget-plugin-grid/selection";
import { executeAction } from "@mendix/widget-plugin-platform/framework/execute-action";
import { GridSelectionProps } from "@mendix/widget-plugin-grid/selection/useGridSelectionProps";
import { removeAllRanges } from "@mendix/widget-plugin-grid/selection/utils";

/**
 * This is sad, but originally row was behaving like a button when DG has a "On click" action.
 * For this case, there is still no good a11y pattern:
 * Discussion 1 - https://github.com/mu-semtech/ember-data-table/issues/20
 * Discussion 2 - https://github.com/dequelabs/axe-core/issues/1942
 * But, maybe that will change in the future?
 * For RowActAsButton, please check https://www.w3.org/WAI/ARIA/apg/patterns/button/#keyboardinteraction
 * For RowActAsSelectable, please check https://www.w3.org/WAI/ARIA/apg/patterns/grid/#datagridsforpresentingtabularinformation
 */
type RowPattern = "RowActAsButton" | "RowActAsSelectable" | "None";

type RowEventHandlers = {
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
};

type RowAriaProps = {
    "aria-selected"?: boolean | undefined;
};

type ActionProp = ListActionValue | undefined;

type RowFinalProps = RowEventHandlers & RowAriaProps;

function getPattern(selectionType: SelectionType, action: ActionProp): RowPattern {
    if (selectionType === "Single" || selectionType === "Multi") {
        return "RowActAsSelectable";
    }

    if (action) {
        return "RowActAsButton";
    }

    return "None";
}

function rowPropsButton(item: ObjectItem, action: ActionProp): RowFinalProps {
    const callback = (): void => executeAction(action?.get(item));

    return {
        onClick: callback,
        onKeyUp(event) {
            if (event.code !== "Enter" && event.code !== "Space") {
                return;
            }

            if (isOwnCell(event.currentTarget, event.target as Element)) {
                callback();
            }
        }
    };
}

function rowPropsSelectable(item: ObjectItem, selectionProps: GridSelectionProps): RowFinalProps {
    if (selectionProps.selectionType === "None") {
        return {};
    }

    const callback = (item: ObjectItem, shiftKey: boolean): void => {
        selectionProps.onSelect(item, shiftKey);
    };

    return {
        "aria-selected": selectionProps.isSelected(item),
        onClick(event) {
            if (event.shiftKey) {
                removeAllRanges();
            }
            callback(item, event.shiftKey);
        },
        onKeyDown: selectionProps.onKeyDown,
        onKeyUp(event) {
            selectionProps.onKeyUp?.(event, item);
        }
    };
}

function isOwnCell(row: Element, cell: Element): boolean {
    return Array.from(row.children).includes(cell);
}

export function useRowEventHandlers(
    item: ObjectItem,
    selectionProps: GridSelectionProps,
    action: ActionProp
): RowFinalProps {
    function computeProps(): RowFinalProps {
        const pattern = getPattern(selectionProps.selectionType, action);

        if (pattern === "RowActAsButton") {
            return rowPropsButton(item, action);
        }

        if (pattern === "RowActAsSelectable") {
            return rowPropsSelectable(item, selectionProps);
        }

        return {};
    }

    return useMemo(computeProps, [item, selectionProps, action]);
}

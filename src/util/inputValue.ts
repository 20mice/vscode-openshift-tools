/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { InputBox, QuickInputButton, QuickInputButtons, ThemeIcon, window } from 'vscode';

export class quickBtn implements QuickInputButton {
    constructor(public iconPath: ThemeIcon, public tooltip: string) { }
}

/*
    * Shows a Input Field to type in a username. Returns either:
    * - username string, or
    * - `null` in case of user cancelled (pressed `ESC`), or
    * - `undefined` if user pressed `Back` button
    * @param prompt A prompt text to be shown
    * @param initialValue an initial value
    * @param password a boolean indicating if the chars are to be hidden (i.e. a password is to be typed in)
    * @param validate a callback function to be invoked to validate value
    * @param placeHolder (optional) A place holder text to be shown
    * @param abortController if provided, allows cancelling the operation
    * @returns string contaning user name or null if cancelled or undefined if Back is pressed
    */
export function inputValue(prompt: string, initialValue: string, password: boolean, validate, placeHolder?: string,
        abortController?: AbortController): Promise<string | null | undefined> {
    return new Promise<string | null | undefined>((resolve, reject) => {
        const input: InputBox = window.createInputBox();
        input.value = initialValue;
        input.prompt = prompt;
        input.password = password;
        if (placeHolder) input.placeholder = placeHolder;
        const enterBtn = new quickBtn(new ThemeIcon('check'), 'Enter');
        const cancelBtn = new quickBtn(new ThemeIcon('close'), 'Cancel');
        input.buttons = [QuickInputButtons.Back, enterBtn, cancelBtn];
        const validationMessage: string = validate(input.value? input.value : '');
        const resolveAndClose = ((result) => {
            input.dispose();
            resolve(result);
        });
        input.ignoreFocusOut = true;
        if (validationMessage) {
            input.validationMessage = validationMessage;
        }
        const acceptInput = async () => {
            const value = input.value;
            input.enabled = false;
            input.busy = true;
            if (!(await validate(value))) {
                input.hide();
                resolve(value);
            }
            input.enabled = true;
            input.busy = false;
        };
        input.onDidAccept(acceptInput);
        input.onDidChangeValue(async text => {
            const current = validate(text);
            const validating = current;
            const validationMessage = await current;
            if (current === validating) {
                input.validationMessage = validationMessage;
            }
        });
        input.onDidHide(() => {
            input.dispose();
            resolve(null);
        })
        input.onDidTriggerButton(async (event) => {
            if (event === QuickInputButtons.Back) resolveAndClose(undefined);
            else if (event === cancelBtn) resolveAndClose(null);
            else if (event === enterBtn) await acceptInput();
        });
        if (abortController) {
            abortController.signal.addEventListener('abort', (ev) => resolveAndClose(null));
        }
        input.show();
    });
}

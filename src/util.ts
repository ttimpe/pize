
import readline from 'readline';
export class Util {

        static log(...args) {
            // Clear the current prompt
         /*
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, process.stdout.rows - 2);
          */
            // Log the message above the prompt
            console.log(...args);
          /*
            // Move the cursor back to the prompt line
            readline.cursorTo(process.stdout, 0, process.stdout.rows - 1);
            readline.clearLine(process.stdout, 0);
            */
        }
}
/**
 * makecode MonkMakes CO2 Dock
 * MonkMakes Ltd
 * Author: Simon Monk @ https://www.monkmakes.com
 * Date: 2024-08-29
 * 
 * A fork and modification of the Sensiron makecode extension here: 
 * https://github.com/Sensirion/makecode-extension-scd41
 * 
 * Blocks have been renamed for compatability with other MonkMakes products
 * and new blocks have been added for altitude compensation and calibration.
 * 
 */

/**
 * MonkMakes CO2 Dock
 */
//% color=190 weight=100 icon="\uf1bb" block="CO2 Dock"
namespace SCD41 {

    const SCD41_I2C_ADDR = 0x62;

    let co2 = 0;
    let temperature = 0;
    let relative_humidity = 0;

    let DATA_READY_COMMAND = 0xE4B8;
    let READ_MEASUREMENTS_COMMAND = 0xEC05;
    let START_CONT_MEASUREMENTS_COMMAND = 0x21b1;
    let STOP_CONT_MEASUREMENTS_COMMAND = 0x3F86;
    let CALIBRATE_COMMAND = 0x362F;
    let FACTORY_RESET_COMMAND = 0x3632;

    start_continuous_measurement();

    function read_word(repeat = false) {
        let value = pins.i2cReadNumber(SCD41_I2C_ADDR, NumberFormat.UInt16BE, repeat);
        pins.i2cReadNumber(SCD41_I2C_ADDR, NumberFormat.UInt8BE, repeat);
        return value
    }

    function read_words(number_of_words: number) {
        let buffer = pins.i2cReadBuffer(SCD41_I2C_ADDR, number_of_words * 3, false);
        let words:number[] = [];
        for (let i = 0; i < number_of_words; i++) {
            words.push(buffer.getNumber(NumberFormat.UInt16BE, 3*i));
        }
        return words;
    }


    function calc_crc(word: number) {
        // You can thank Chat GTP for this function
        // Define the CRC-8 polynomial and initial value
        const polynomial = 0x31;  // CRC-8 polynomial (x^8 + x^2 + x + 1)
        let crc = 0xFF;           // Initial CRC value (you may change this depending on the standard)
    
        // Break the 16-bit word into two bytes
        const highByte = (word >> 8) & 0xFF; // Extract the high byte
        const lowByte = word & 0xFF;         // Extract the low byte
    
        // Process the high byte
        crc ^= highByte;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xFF; // Ensure CRC remains 8-bit
        }
    
        // Process the low byte
        crc ^= lowByte;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xFF; // Ensure CRC remains 8-bit
        }
    
        return crc;
    }

    function sendCommand(command:number, param:number) {
        // Sends a command along with arguments and CRC (CRC on params only)
        // 2 byte command, 2 byte param, single byte CRC
        let crc = calc_crc(param) 
        pins.i2cWriteNumber(SCD41_I2C_ADDR, command, NumberFormat.UInt16BE, false)
        pins.i2cWriteNumber(SCD41_I2C_ADDR, param, NumberFormat.UInt16BE, false)
        pins.i2cWriteNumber(SCD41_I2C_ADDR, crc, NumberFormat.UInt8BE, false)
    }


    function get_data_ready_status() {
        pins.i2cWriteNumber(SCD41_I2C_ADDR, DATA_READY_COMMAND, NumberFormat.UInt16BE);
        basic.pause(1);
        let data_ready = read_word() & 0x07FF;
        return data_ready > 0;
    }

    function read_measurement() {
        // only read measurement if data is available, else use last measurement
        if (!get_data_ready_status()) {
            return
        }
        pins.i2cWriteNumber(SCD41_I2C_ADDR, READ_MEASUREMENTS_COMMAND, NumberFormat.UInt16BE);
        basic.pause(1);
        let values = read_words(6);
        co2 = values[0];
        let adc_t = values[1];
        let adc_rh = values[2];
        temperature =  -45 + (175 * adc_t / (1 << 16));
        relative_humidity = 100 * adc_rh / (1 << 16);
    }

    /**
     * Start the sensor. You only need to call this if you have previously stopped readings using the [pause CO2 Dock], perhaps to save battery power.
     */
    //% blockId="SCD41_START_CONTINUOUS_MEASUREMENT" block="start CO2 Dock"
    //% weight=80 blockGap=8
    //% advanced=true
    export function start_continuous_measurement() {
        pins.i2cWriteNumber(SCD41_I2C_ADDR, START_CONT_MEASUREMENTS_COMMAND, NumberFormat.UInt16BE);
    }

    /**
     * Pause the sensor, perhaps to save battery power.
     */
    //% blockId="SCD41_STOP_CONTINUOUS_MEASUREMENT" block="pause CO2 Dock"
    //% advanced=true
    //% weight=80 blockGap=8
    export function stop_continuous_measurement() {
        pins.i2cWriteNumber(SCD41_I2C_ADDR, STOP_CONT_MEASUREMENTS_COMMAND, NumberFormat.UInt16BE);
    }


    /**
     * Get CO2 reading in ppm. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_CO2" block="CO2 ppm"
    //% weight=80 blockGap=8
    export function get_co2() {
        read_measurement();
        return co2;
    }

    /**
     * Get temperature reading in degrees C. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_TEMPERATURE" block="temperature"
    //% weight=80 blockGap=8
    export function get_temperature() {
        read_measurement();
        return temperature;   
    }

    /**
     * Get relative humidity as a percentage. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_RELATIVE_HUMIDITY" block="humidity"
    //% weight=80 blockGap=8
    export function get_relative_humidity() {
        read_measurement();
        return relative_humidity;
    }

    /**
     * Calibrate to 400 ppm
     */
    //% blockId="SCD41_CALIBRATE_400" block="calibrate 400"
    //% advanced=true
    //% weight=80 blockGap=8
    export function calibrate_400() {
        stop_continuous_measurement();
        sendCommand(CALIBRATE_COMMAND, 400);
        start_continuous_measurement();
    }

    /**
     * Perform a factory reset
     */
    //% blockId="SCD41_PERFORM_FACTORY_RESET" block="factory reset"
    //% advanced=true
    //% weight=80 blockGap=8
    export function perform_factory_reset() {
        // no call to persist settings needed 
        pins.i2cWriteNumber(SCD41_I2C_ADDR, FACTORY_RESET_COMMAND, NumberFormat.UInt16BE);
    }
}

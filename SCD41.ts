namespace SCD41 {

    const SCD41_I2C_ADDR = 0x62;

    let co2 = 0;
    let temperature = 0;
    let relative_humidity = 0;

    let DATA_READY_COMMAND = 0xE4B8;
    let READ_MEASUREMENTS_COMMAND = 0xEC05;
    let START_CONT_MEASUREMENTS_COMMAND = 0x21b1;
    let CALIBRATE_COMMAND = 0x0;
    let FACTORY_RESET_COMMAND = 0x3632;

    init();

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
     * start continuous measurement. Call this before reading measurements
     */
    //% blockId="SCD41_START_CONTINUOUS_MEASUREMENT" block="start CO2 Dock"
    //% weight=80 blockGap=8
    export function start_continuous_measurement() {
        pins.i2cWriteNumber(SCD41_I2C_ADDR, START_CONT_MEASUREMENTS_COMMAND, NumberFormat.UInt16BE);
    }


    /**
     * get CO2. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_CO2" block="CO2 ppm"
    //% weight=80 blockGap=8
    export function get_co2() {
        read_measurement();
        return co2;
    }

    /**
     * get temperature. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_TEMPERATURE" block="temperature"
    //% weight=80 blockGap=8
    export function get_temperature() {
        read_measurement();
        return temperature;   
    }

    /**
     * get relative humidity. Call this at most once every 5 seconds, else last measurement value will be returned
     */
    //% blockId="SCD41_GET_RELATIVE_HUMIDITY" block="humidity"
    //% weight=80 blockGap=8
    export function get_relative_humidity() {
        read_measurement();
        return relative_humidity;
    }

    /**
     * calibrate to 400 ppm
     */
    //% blockId="SCD41_CALIBRATE_400" block="calibrate 400"
    //% weight=80 blockGap=8
    export function calibrate_400() {
        // change below to correct call, this a factory reset at moment
        pins.i2cWriteNumber(SCD41_I2C_ADDR, CALIBRATE_COMMAND, NumberFormat.UInt16BE);
    }

    /**
     * perform a factory reset
     */
    //% blockId="SCD41_PERFORM_FACTORY_RESET" block="factory reset"
    //% weight=80 blockGap=8
    export function perform_factory_reset() {
        pins.i2cWriteNumber(SCD41_I2C_ADDR, FACTORY_RESET_COMMAND, NumberFormat.UInt16BE);
    }
}
